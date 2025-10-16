import OpenAI from "openai";
import type { ApvExtractionResult, SpeciesBreakdown } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const speciesMapping: Record<string, string> = {
  "MOLID": "Molid",
  "MOLIDUL": "Molid",
  "MOLIZI": "Molid",
  "BRAD": "Molid",
  "BRADULUI": "Molid",
  "BRAZI": "Molid",
  "STEJAR": "Stejar",
  "STEJARUL": "Stejar",
  "STEJARI": "Stejar",
  "GORUN": "Stejar",
  "GORUNUL": "Stejar",
  "GORUNI": "Stejar",
  "CER": "Stejar",
  "CERUL": "Stejar",
  "FAG": "Fag",
  "FAGUL": "Fag",
  "FAGI": "Fag",
  "PALTIN": "Paltin",
  "PALTINUL": "Paltin",
  "PALTINI": "Paltin",
  "FRASIN": "Frasin",
  "FRASINUL": "Frasin",
  "FRASINI": "Frasin",
  "MESTEAN": "Fag",
  "MESTEACAN": "Fag",
  "MESTEACANUL": "Fag",
  "SALCAM": "Frasin",
  "SALCAMUL": "Frasin",
  "PIN": "Molid",
  "PINUL": "Molid",
  "PINI": "Molid",
  "RASINOASE": "Molid",
  "FOIOASE": "Stejar",
};

export async function extractApvData(imageBase64: string): Promise<ApvExtractionResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting data from Romanian forestry documents (APV - Act de Punere în Valoare). 
Extract the following information and return it as JSON:
- permitNumber: The APV number (look for "Denumire A.P.V" or "APV nr.")
- permitCode: Official APV code number (look for "ACT DE PUNERE ÎN VALOARE NR." - usually a long numeric code like "2500010900300")
- upLocation: Unitate de Productie (UP location, e.g., "XIII - Păsune Beceni")
- uaLocation: U.A. location (e.g., "4 D")
- forestCompany: The name of the forest management company (e.g., "ASOCIATIA OCOLUL SILVIC EVER GREEN")
- dateOfMarking: Date when trees were marked (look for "Data marcajului" or "Data inventarierii")
- surfaceHa: Surface area in hectares (look for "Suprafață totală act" or "ha")
- volumeM3: Total volume in cubic meters (look for "Total volum brut" or similar)
- netVolume: Net volume in cubic meters (look for "volum net" or "Volum lemn net")
- grossVolume: Gross volume in cubic meters (look for "volum brut" or "Volum lemn brut")
- firewoodVolume: Firewood volume in cubic meters (look for "Lemn foc" or "lemn de foc")
- barkVolume: Bark volume in cubic meters (look for "Scoarță" or "coajă")
- treatmentType: Type of forest treatment (look for "Tratament" field - values like "RARITURI", "CURATIRI", "DEGAJARI")
- productType: Nature of wood product (look for "Natura Produsului" - values like "PRODUSE PRINCIPALE", "PRODUSE SECUNDARE")
- extractionMethod: Method of extraction (look for "Tehnologia de Exploatare" - values like "SORTIMENTE", "MULTIPLI DE SORTIMENTE", "ARBORE INTREG")
- harvestYear: Year of exploitation (look for "Anul exploatarii" - format YYYY)
- inventoryMethod: Inventory procedure (look for "Procedeul de inventariere" - values like "FIR CU FIR", "PROBĂ")
- hammerMark: Forest hammer mark ID (look for "Ciocan forma CIRCULARĂ nr." or similar)
- accessibility: Access difficulty score or range (look for "Accesibilitate" - values like "1001-1500" or numeric codes)
- species: Primary species name (e.g., "MOLID", "STEJAR", "FAG")
- volumePerSpecies: Object mapping species to their volumes (e.g., {"Molid": 45.5, "Fag": 21.47})
- numberOfTrees: Total number of trees (look for "Nr. arbori" or "Nr. arb")
- averageHeight: Average height of trees in meters (look for "Înălțimi" or "Hm")
- averageDiameter: Average diameter in cm (look for "Diametre" or "dt" or "dcg")
- averageAge: Average age of trees in years (look for "Vârsta" - integer value)
- slopePercent: Terrain slope percentage (look for "Pantă %" - integer value)
- sortVolumes: Object with dimensional sorting volumes (e.g., {"G1": 2.66, "G2": 27.62, "G3": 12.96, "M1": 10.31, "M2": 2.58, "LS": 10.42})
- dimensionalSorting: Detailed dimensional sorting as string (e.g., "G1: 2.66mc, G2: 27.62mc, G3: 12.96mc, M1: 10.31mc, M2: 2.58mc, LS: 10.42mc")
- grading: Grading breakdown as a string (legacy field)

Return ONLY valid JSON, no other text.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the APV data from this Romanian forestry permit document:",
            },
            {
              type: "image_url",
              image_url: {
                // Use the full data URL with proper mime type (e.g., data:image/jpeg;base64,...)
                url: imageBase64,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response");
    }

    const extracted = JSON.parse(jsonMatch[0]);

    const normalizeNumber = (value: any): number => {
      if (!value) return 0;
      const str = String(value)
        .replace(/,/g, '.')
        .replace(/[^\d.]/g, '')
        .replace(/\.(?=.*\.)/g, '');
      return parseFloat(str) || 0;
    };

    const speciesValue = extracted.species || "";
    const mappedSpecies = speciesValue 
      ? (speciesMapping[speciesValue.toUpperCase()] || "Molid")
      : "Molid";

    const volumeM3 = normalizeNumber(extracted.volumeM3);
    const netVolume = normalizeNumber(extracted.netVolume);
    const grossVolume = normalizeNumber(extracted.grossVolume);
    const surfaceHa = normalizeNumber(extracted.surfaceHa) || undefined;
    const firewoodVolume = normalizeNumber(extracted.firewoodVolume) || undefined;
    const barkVolume = normalizeNumber(extracted.barkVolume) || undefined;
    const numberOfTrees = extracted.numberOfTrees ? parseInt(String(extracted.numberOfTrees)) : undefined;
    const averageHeight = normalizeNumber(extracted.averageHeight) || undefined;
    const averageDiameter = normalizeNumber(extracted.averageDiameter) || undefined;

    const normalizeSpeciesName = (species: string): string => {
      const upperSpecies = species.toUpperCase();
      return speciesMapping[upperSpecies] || "Molid";
    };

    const volumePerSpecies: Record<string, number> | undefined = extracted.volumePerSpecies 
      ? Object.entries(extracted.volumePerSpecies).reduce((acc, [species, vol]) => {
          const normalizedSpecies = normalizeSpeciesName(species);
          const normalizedVolume = normalizeNumber(vol);
          
          if (acc[normalizedSpecies]) {
            acc[normalizedSpecies] += normalizedVolume;
          } else {
            acc[normalizedSpecies] = normalizedVolume;
          }
          
          return acc;
        }, {} as Record<string, number>)
      : undefined;

    const sortVolumes: Record<string, number> | undefined = extracted.sortVolumes
      ? Object.entries(extracted.sortVolumes).reduce((acc, [sort, vol]) => {
          const normalizedVolume = normalizeNumber(vol);
          if (normalizedVolume > 0) {
            acc[sort] = normalizedVolume;
          }
          return acc;
        }, {} as Record<string, number>)
      : undefined;

    const speciesBreakdown: SpeciesBreakdown[] = calculateSpeciesBreakdown(
      mappedSpecies,
      volumeM3,
      volumePerSpecies
    );

    return {
      permitNumber: extracted.permitNumber || "",
      permitCode: extracted.permitCode || undefined,
      upLocation: extracted.upLocation || "",
      uaLocation: extracted.uaLocation || "",
      forestCompany: extracted.forestCompany || "",
      dateOfMarking: extracted.dateOfMarking || undefined,
      surfaceHa,
      volumeM3,
      netVolume: netVolume || undefined,
      grossVolume: grossVolume || undefined,
      firewoodVolume,
      barkVolume,
      treatmentType: extracted.treatmentType || undefined,
      productType: extracted.productType || undefined,
      extractionMethod: extracted.extractionMethod || undefined,
      harvestYear: extracted.harvestYear ? parseInt(String(extracted.harvestYear)) : undefined,
      inventoryMethod: extracted.inventoryMethod || undefined,
      hammerMark: extracted.hammerMark || undefined,
      accessibility: extracted.accessibility || undefined,
      species: mappedSpecies,
      volumePerSpecies,
      numberOfTrees,
      averageHeight,
      averageDiameter,
      averageAge: extracted.averageAge ? parseInt(String(extracted.averageAge)) : undefined,
      slopePercent: extracted.slopePercent ? parseInt(String(extracted.slopePercent)) : undefined,
      sortVolumes,
      dimensionalSorting: extracted.dimensionalSorting || undefined,
      speciesBreakdown,
      diameter: extracted.diameter || "",
      grading: extracted.grading || "",
      rawText: content,
    };
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw new Error(`Failed to extract APV data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function calculateSpeciesBreakdown(
  species: string, 
  totalVolume: number, 
  volumePerSpecies?: Record<string, number>
): SpeciesBreakdown[] {
  if (volumePerSpecies && Object.keys(volumePerSpecies).length > 0 && totalVolume > 0) {
    return Object.entries(volumePerSpecies).map(([speciesName, volume]) => ({
      species: speciesName as any,
      percentage: Math.round((volume / totalVolume) * 100 * 100) / 100,
    }));
  }
  
  return [
    {
      species: species as any,
      percentage: 100,
    },
  ];
}
