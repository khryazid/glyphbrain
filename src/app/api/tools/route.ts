import { NextResponse } from 'next/server';
import { executeFunctionCall } from '@/lib/gemini/agent';

export async function POST(req: Request) {
  try {
    const { name, args } = await req.json();

    if (!name || !args) {
      return NextResponse.json({ error: 'Faltan parámetros (name, args)' }, { status: 400 });
    }

    const { result, action } = await executeFunctionCall(name, args);
    return NextResponse.json({ result, action });
  } catch (error: any) {
    console.error('Error en /api/tools:', error);
    return NextResponse.json(
      { error: error.message || 'Error ejecutando herramienta' },
      { status: 500 }
    );
  }
}
