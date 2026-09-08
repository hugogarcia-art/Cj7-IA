import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Módulo 1: Agente IA WhatsApp
  async generateWhatsAppResponse(
    userMessage: string,
    clientName: string,
    inventory: string,
  ) {
    const systemPrompt = `
      Eres un vendedor experto de la empresa CJ7 IA. Tu objetivo es cerrar ventas por WhatsApp.
      Cliente: ${clientName}
      Catálogo de productos disponible:
      ${inventory}
      
      Instrucciones:
      1. Responde como un humano, amable y conciso.
      2. Si el cliente pregunta por productos, recomienda SOLO los del catálogo.
      3. No inventes precios, usa los del catálogo.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  }

  // Módulo 7: Generador de Imágenes IA
  async generateAdImage(prompt: string) {
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: `Imagen publicitaria profesional, estilo minimalista, fondo limpio, iluminación de estudio: ${prompt}`,
      n: 1,
      size: '1024x1024',
    });
    return response.data?.[0]?.url;
  }
}
