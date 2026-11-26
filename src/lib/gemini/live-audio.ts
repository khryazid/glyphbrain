export class AudioStreamer {
  private audioContext: AudioContext;
  private recordContext: AudioContext | null = null;
  private workletNode: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;
  private onAudioData: (base64: string) => void;
  private isRecording = false;

  // Buffer de reproducción para audio entrante de Gemini
  private playQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;

  constructor(onAudioData: (base64: string) => void) {
    // Contexto nativo para reproducción sin glitches
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.onAudioData = onAudioData;
  }

  // --- RECORDING (Mic -> Gemini) ---

  async startRecording() {
    if (this.isRecording) return;
    
    // Contexto forzado a 16kHz exclusivo para grabar (Gemini requiere 16kHz)
    this.recordContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });

    if (this.recordContext.state === 'suspended') {
      await this.recordContext.resume();
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      const source = this.recordContext.createMediaStreamSource(this.mediaStream);

      const bufferSize = 4096;
      const scriptNode = this.recordContext.createScriptProcessor(bufferSize, 1, 1);

      scriptNode.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        let maxVol = 0;
        // Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        const GAIN = 5.0; // Multiplicador de ganancia digital
        
        for (let i = 0; i < inputData.length; i++) {
          let val = inputData[i] * GAIN;
          if (Math.abs(val) > maxVol) maxVol = Math.abs(val);
          
          const s = Math.max(-1, Math.min(1, val));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        if ((this as any)._volCallback) {
          (this as any)._volCallback(maxVol);
        }

        // Convert Int16Array to Base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true); // Little endian
        }
        
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
        }
        
        const base64 = window.btoa(binary);
        this.onAudioData(base64);
      };

      source.connect(scriptNode);
      scriptNode.connect(this.recordContext.destination);

      this.workletNode = scriptNode;
      this.isRecording = true;
    } catch (err) {
      console.error('Error accediendo al micrófono:', err);
      throw err;
    }
  }

  stopRecording() {
    this.isRecording = false;
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.recordContext) {
      this.recordContext.close();
      this.recordContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  // --- PLAYBACK (Gemini -> Speaker) ---

  playAudioChunk(base64: string) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Convert Int16 (Little Endian) to Float32
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create AudioBuffer - Gemini devuelve audio a 24kHz!
    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    this.playQueue.push(audioBuffer);
    this.scheduleNextPlay(); // Programar inmediatamente en el hilo de audio nativo
  }

  private scheduleNextPlay() {
    const currentTime = this.audioContext.currentTime;

    // Programar todos los chunks disponibles en la cola de una vez
    while (this.playQueue.length > 0) {
      const buffer = this.playQueue.shift()!;
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      // Si nos hemos quedado atrás (silencio prolongado), adelantamos el reloj 
      // ligeramente para dar un pequeño buffer (jitter buffer de 100ms)
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.1;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
    }
  }

  stopPlayback() {
    this.playQueue = [];
    this.nextPlayTime = 0;
    this.isPlaying = false;
  }
}
