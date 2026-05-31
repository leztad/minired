import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API endpoint for Diagnosis
app.post("/api/diagnose", async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY no está configurada o está vacía. Por favor, añádela en la barra de Ajustes > Secretos (Settings > Secrets) en tu panel para habilitar el Diagnóstico Inteligente." 
      });
    }

    const { devices, activeAnomaly, activeSensors, subnet } = req.body;

    const systemInstruction = 
      "Eres un Ingeniero de Ciberseguridad y Especialista de Conectividad de Redes con más de 15 años de experiencia. " +
      "Tu misión es analizar la estructura, latencias y anomalías de la red local escaneada para proveer informes legibles por humanos, informativos y altamente útiles. " +
      "Proporciona descripciones concisas pero elegantes con apartados útiles. Utiliza formato Markdown limpio y profesional con iconos o emojis coherentes pero discretos.";

    const prompt = `Analiza la siguiente configuración de red local:
Subred actual: ${subnet || '192.168.1.0/24'}
Anomalía activa en simulación: ${activeAnomaly || 'Ninguna'}
Total de sensores activos: ${activeSensors ? activeSensors.length : 0}

Lista de dispositivos escaneados relevantes (activos y caídos significativos):
${JSON.stringify(devices.filter((d: any) => d.estado !== 'Caído' || d.mac !== '—'), null, 2)}

Por favor proporciona un informe detallado con el siguiente formato Markdown:

# 📊 INFORME DE DIAGNÓSTICO INTELIGENTE (IA CO-PILOTO)

## 1. 🌡️ Estado General y Salud de la LAN
Analiza el estado de conectividad promedio. Si hay anomalías o altos pings, coméntalo aquí de forma técnica y descriptiva (ej. saturación, congestión).

## 2. 🛡️ Análisis de Anomalías de Red Detectadas
Explica qué es la anomalía activa "${activeAnomaly}" (si hay alguna) y cuáles son las repercusiones inmediatas en la LAN. Si no hay anomalías activas, felicita al administrador y explica brevemente los riesgos comunes de una subred doméstica promedio.

## 3. 🔍 Escaneo y Descubrimiento Físico (Análisis MAC / Vendor)
Examina las direcciones MAC de los hosts principales (Router Gateway, Estación de Trabajo, etc.) y deduce si pertenecen a marcas o fabricantes específicos típicos (como Cisco/Realtek, Huawei, Apple, Sony, Docker Virtual, etc.) y explica el valor de inspeccionar esto para impedir impostores de red ("ARP Spoofing").

## 4. 🚀 Plan de Acción Recomendado (Recomendaciones Técnicas)
Proporciona 3 a 5 pasos exactos que el usuario puede realizar para mejorar la seguridad, reducir la latencia de juego, u optimizar la distribución DHCP e IP en esta red.
`;

    let response;
    let modelUsed = "gemini-3.5-flash";

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
    } catch (primaryError: any) {
      console.warn("Primary model gemini-3.5-flash failed or was throttled, trying fallback gemini-3.1-flash-lite...", primaryError);
      modelUsed = "gemini-3.1-flash-lite";
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (fallbackError: any) {
        console.error("Both primary and fallback Gemini models failed.", fallbackError);
        const is503 = String(fallbackError).includes("503") || 
                      String(fallbackError).includes("UNAVAILABLE") || 
                      String(fallbackError).includes("high demand") || 
                      String(primaryError).includes("503") || 
                      String(primaryError).includes("UNAVAILABLE") || 
                      String(primaryError).includes("high demand");
        
        if (is503) {
          return res.status(503).json({ 
            error: "⚠️ ¡Servidores de IA temporalmente saturados! El modelo Gemini de Google está experimentando una congestión o demanda extremadamente alta en este momento (Error 503). Por favor, espera unos segundos y pulsa 'Re-intentar Diagnóstico' o 'Generar Diagnóstico Completo' para volver a conectar." 
          });
        }
        throw fallbackError;
      }
    }

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: error.message || "Error al procesar el diagnóstico inteligente." });
  }
});

async function start() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
