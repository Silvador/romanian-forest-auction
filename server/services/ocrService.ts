import OpenAI from "openai";
import type { ApvExtractionResult, SpeciesBreakdown } from "@shared/schema";

// Lazy initialization - only create OpenAI client when needed
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'sk-placeholder' || apiKey === 'sk-your-openai-api-key-here') {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

const speciesMapping: Record<string, string> = {
  // Stejar variants
  "STEJAR": "Stejar pedunculat",
  "STEJARUL": "Stejar pedunculat",
  "STEJARI": "Stejar pedunculat",
  "STEJAR PEDUNCULAT": "Stejar pedunculat",
  "STEJAR PEDUNCULAT (L)": "Stejar pedunculat",
  "ST (L)": "Stejar pedunculat",
  "ST(L)": "Stejar pedunculat",
  "STEJAR BRUMARIU": "Stejar brumăriu",
  "STEJAR BRUMĂRIU": "Stejar brumăriu",

  // Gorun and Cer
  "GORUN": "Gorun",
  "GORUNUL": "Gorun",
  "GORUNI": "Gorun",
  "GORUN (L)": "Gorun",
  "CER": "Cer",
  "CERUL": "Cer",
  "CERULUI": "Cer",

  // Fag
  "FAG": "Fag",
  "FAGUL": "Fag",
  "FAGI": "Fag",

  // Carpen
  "CARPEN": "Carpen",
  "CARPENUL": "Carpen",
  "CA": "Carpen",

  // Frasin
  "FRASIN": "Frasin",
  "FRASINUL": "Frasin",
  "FRASINI": "Frasin",
  "FR": "Frasin",

  // Jugastru
  "JUGASTRU": "Jugastru",
  "JUGASTRUL": "Jugastru",
  "JU": "Jugastru",

  // Paltin variants
  "PALTIN": "Paltin de câmp",
  "PALTINUL": "Paltin de câmp",
  "PALTINI": "Paltin de câmp",
  "PALTIN DE CAMP": "Paltin de câmp",
  "PALTIN DE CÂMP": "Paltin de câmp",
  "PALTIN DE MUNTE": "Paltin de munte",

  // Tei variants
  "TEI ARGINTIU": "Tei argintiu",
  "TEIUL ARGINTIU": "Tei argintiu",
  "TEI": "Tei argintiu",
  "TEIUL": "Tei argintiu",
  "TE": "Tei argintiu",
  "TEI CU FRUNZE MARI": "Tei cu frunze mari",

  // Ulm variants
  "ULM": "Ulm de câmp",
  "ULMUL": "Ulm de câmp",
  "ULM DE CAMP": "Ulm de câmp",
  "ULM DE CÂMP": "Ulm de câmp",
  "ULC": "Ulm de câmp",
  "ULM DE MUNTE": "Ulm de munte",

  // Anin variants
  "ANIN NEGRU": "Anin negru",
  "ANINUL NEGRU": "Anin negru",
  "ANIN": "Anin negru",
  "ANN": "Anin negru",
  "ANIN ALB": "Anin alb",
  "ANINUL ALB": "Anin alb",

  // Mesteacan
  "MESTEACAN": "Mesteacăn",
  "MESTEACANUL": "Mesteacăn",
  "MESTEAN": "Mesteacăn",
  "MESTEANUL": "Mesteacăn",

  // Plop variants
  "PLOP": "Plop tremurător",
  "PLOPUL": "Plop tremurător",
  "PLOPI": "Plop tremurător",
  "PLOP TREMUR": "Plop tremurător",
  "PLOP TREMURĂTOR": "Plop tremurător",
  "PLOP ALB": "Plop alb",
  "PLOP NEGRU": "Plop negru",

  // Salcie
  "SALCIE": "Salcie albă",
  "SALCIA": "Salcie albă",
  "SALCIE ALBA": "Salcie albă",
  "SALCIE ALBĂ": "Salcie albă",

  // Salcam
  "SALCAM": "Salcâm",
  "SALCAMUL": "Salcâm",
  "SALCAMI": "Salcâm",

  // Fruit trees
  "CIRES": "Cireș sălbatic",
  "CIRESUL": "Cireș sălbatic",
  "CIREŞ SĂLBATIC": "Cireș sălbatic",
  "MAR": "Măr sălbatic",
  "MĂR SĂLBATIC": "Măr sălbatic",
  "PAR": "Păr sălbatic",
  "PĂR SĂLBATIC": "Păr sălbatic",
  "SORB": "Sorb de munte",
  "SORB DE MUNTE": "Sorb de munte",

  // Nuc and Castanul
  "NUC": "Nuc",
  "NUCUL": "Nuc",
  "NUCI": "Nuc",
  "CASTAN": "Castanul",
  "CASTANUL": "Castanul",

  // Molid and Brad
  "MOLID": "Molid",
  "MOLIDUL": "Molid",
  "MOLIZI": "Molid",
  "BRAD": "Brad",
  "BRADUL": "Brad",
  "BRAZI": "Brad",

  // Pin variants
  "PIN": "Pin silvestru",
  "PINUL": "Pin silvestru",
  "PINI": "Pin silvestru",
  "PIN SILVESTRU": "Pin silvestru",
  "PIN NEGRU": "Pin negru",

  // Other conifers
  "LARICE": "Larice",
  "LARICELE": "Larice",
  "ZÂMBRU": "Zâmbru",
  "ZAMBRU": "Zâmbru",
  "TISA": "Tisă",
  "TISĂ": "Tisă",

  // General categories
  "RASINOASE": "Molid",
  "RĂSINOASE": "Molid",
  "FOIOASE": "Stejar pedunculat",
  "ALTELE": "Altele",
  "DIVERSE": "Altele",
};

export async function extractApvData(imageBase64: string): Promise<ApvExtractionResult> {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
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
- productType: Nature of wood product (look for "Natura Produsului" - values like "PRODUSE PRINCIPALES", "PRODUSE SECUNDARE")
- extractionMethod: Method of extraction (look for "Tehnologia de Exploatare" - values like "SORTIMENTE", "MULTIPLI DE SORTIMENTE", "ARBORE INTREG")
- harvestYear: Year of exploitation (look for "Anul exploatarii" - format YYYY)
- inventoryMethod: Inventory procedure (look for "Procedeul de inventariere" - values like "FIR CU FIR", "PROBĂ")
- hammerMark: Forest hammer mark ID (look for "Ciocan forma CIRCULARĂ nr." or similar)
- accessibility: Access difficulty score or range (look for "Accesibilitate" - values like "1001-1500" or numeric codes)
- species: Primary/dominant species name (the species with the largest volume)
- volumePerSpecies: CRITICAL - Extract ALL species from the species breakdown table with their exact volumes. Look for tables with columns like "Specia", "Volum", "mc". Extract every single row as an object mapping species name to volume (e.g., {"ANIN NEGRU": 0.59, "JUGASTRU": 1.02, "CARPEN": 1.06, "STEJAR PEDUNCULAT (L)": 83.12, "TEI ARGINTIU": 0.45, "ULM DE CAMP": 8.87, "FRASIN": 221.21}). This is the most important field - do not miss any species!
- numberOfTrees: Total number of trees (look for "Nr. arbori" or "Nr. arb")
- averageHeight: Average height of trees in meters (look for "Înălțimi" or "Hm")
- averageDiameter: Average diameter in cm (look for "Diametre" or "dt" or "dcg")
- averageAge: Average age of trees in years (look for "Vârsta" - integer value)
- slopePercent: Terrain slope percentage (look for "Pantă %" - integer value)
- sortVolumes: Object with dimensional sorting volumes (e.g., {"G1": 2.66, "G2": 27.62, "G3": 12.96, "M1": 10.31, "M2": 2.58, "LS": 10.42})
- dimensionalSorting: Detailed dimensional sorting as string (e.g., "G1: 2.66mc, G2: 27.62mc, G3: 12.96mc, M1: 10.31mc, M2: 2.58mc, LS: 10.42mc")
- grading: Grading breakdown as a string (legacy field)

IMPORTANT: Pay special attention to the species breakdown table. Extract EVERY species row with its volume. Do not summarize or skip species.

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

    // Enhanced logging for species extraction debugging
    console.log(`[OCR] Extracted raw species: ${extracted.species}`);
    console.log(`[OCR] Extracted volumePerSpecies:`, extracted.volumePerSpecies);

    const normalizeNumber = (value: any): number => {
      if (!value) return 0;
      const str = String(value)
        .replace(/,/g, '.')
        .replace(/[^\d.]/g, '')
        .replace(/\.(?=.*\.)/g, '');
      return parseFloat(str) || 0;
    };

    const normalizeSpeciesName = (species: string): string => {
      const upperSpecies = species.toUpperCase();
      return speciesMapping[upperSpecies] || species; // Keep original name if not in mapping
    };

    // First, normalize volumePerSpecies to get accurate species data
    const volumePerSpecies: Record<string, number> | undefined = extracted.volumePerSpecies
      ? Object.entries(extracted.volumePerSpecies).reduce((acc, [species, vol]) => {
          const normalizedSpecies = normalizeSpeciesName(species);
          const normalizedVolume = normalizeNumber(vol);

          console.log(`[OCR] Mapping species: "${species}" -> "${normalizedSpecies}" (${normalizedVolume} m³)`);

          if (acc[normalizedSpecies]) {
            acc[normalizedSpecies] += normalizedVolume;
          } else {
            acc[normalizedSpecies] = normalizedVolume;
          }

          return acc;
        }, {} as Record<string, number>)
      : undefined;

    console.log(`[OCR] Final normalized volumePerSpecies:`, volumePerSpecies);

    // Determine the dominant species intelligently
    let mappedSpecies: string;

    if (volumePerSpecies && Object.keys(volumePerSpecies).length > 0) {
      // Find the species with the highest volume
      const dominantSpecies = Object.entries(volumePerSpecies).reduce((max, [species, volume]) =>
        volume > max.volume ? { species, volume } : max,
        { species: "", volume: 0 }
      ).species;
      mappedSpecies = dominantSpecies;
      console.log(`[OCR] Dominant species from volumePerSpecies: ${mappedSpecies}`);
    } else if (extracted.species) {
      // Fallback to the extracted primary species
      const speciesValue = extracted.species;
      mappedSpecies = normalizeSpeciesName(speciesValue);
      console.log(`[OCR] Using extracted primary species: ${mappedSpecies}`);
    } else {
      // Last resort fallback
      mappedSpecies = "Frasin";
      console.log(`[OCR] Using fallback species: ${mappedSpecies}`);
    }

    const volumeM3 = normalizeNumber(extracted.volumeM3);
    const netVolume = normalizeNumber(extracted.netVolume);
    const grossVolume = normalizeNumber(extracted.grossVolume);
    const surfaceHa = normalizeNumber(extracted.surfaceHa) || undefined;
    const firewoodVolume = normalizeNumber(extracted.firewoodVolume) || undefined;
    const barkVolume = normalizeNumber(extracted.barkVolume) || undefined;
    const numberOfTrees = extracted.numberOfTrees ? parseInt(String(extracted.numberOfTrees)) : undefined;
    const averageHeight = normalizeNumber(extracted.averageHeight) || undefined;
    const averageDiameter = normalizeNumber(extracted.averageDiameter) || undefined;

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
    // Calculate percentages with rounding and include volumes
    const breakdown = Object.entries(volumePerSpecies).map(([speciesName, volume]) => ({
      species: speciesName as any,
      percentage: Math.round((volume / totalVolume) * 100 * 100) / 100,
      volumeM3: parseFloat(volume.toFixed(2)),
    }));

    // Adjust for rounding errors to ensure total is exactly 100%
    const total = breakdown.reduce((sum, item) => sum + item.percentage, 0);
    const difference = parseFloat((100 - total).toFixed(2));

    if (difference !== 0 && breakdown.length > 0) {
      // Find the species with the largest percentage and adjust it
      const maxIndex = breakdown.reduce((maxIdx, item, idx, arr) =>
        item.percentage > arr[maxIdx].percentage ? idx : maxIdx, 0
      );
      breakdown[maxIndex].percentage = parseFloat((breakdown[maxIndex].percentage + difference).toFixed(2));
    }

    return breakdown;
  }

  return [
    {
      species: species as any,
      percentage: 100,
      volumeM3: totalVolume,
    },
  ];
}
