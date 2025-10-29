import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAuctionSchema, regions, speciesTypes, InsertAuction, SpeciesBreakdown, ApvExtractionResult, DocumentMetadata } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { ChevronLeft, Plus, X, Upload, FileText, Scan } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { createAuctionFirestore } from "@/lib/firestore-operations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { deleteDocument } from "@/lib/storage";

export default function CreateListingPage() {
  const { userData, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [speciesBreakdown, setSpeciesBreakdown] = useState<SpeciesBreakdown[]>([
    { species: "Stejar", percentage: 0 }
  ]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<ApvExtractionResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Document management
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [draftAuctionId, setDraftAuctionId] = useState<string | null>(null);
  const [apvDocumentId, setApvDocumentId] = useState<string | undefined>();

  // Timer controls for testing
  const [startInMinutes, setStartInMinutes] = useState(1);
  const [durationValue, setDurationValue] = useState(7);
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('days');

  const form = useForm<InsertAuction>({
    resolver: zodResolver(insertAuctionSchema),
    defaultValues: {
      title: "",
      description: "",
      region: undefined,
      location: "",
      volumeM3: undefined,
      startingPricePerM3: undefined,
      speciesBreakdown: [],
      startTime: Date.now() + 60000, // Start in 1 minute
      endTime: Date.now() + 60000 + (7 * 24 * 3600000), // + 7 days
    },
  });

  // Update times when timer controls change
  const updateAuctionTimes = () => {
    const startTime = Date.now() + (startInMinutes * 60000);
    let durationMs = 0;

    switch (durationUnit) {
      case 'minutes':
        durationMs = durationValue * 60000;
        break;
      case 'hours':
        durationMs = durationValue * 3600000;
        break;
      case 'days':
        durationMs = durationValue * 24 * 3600000;
        break;
    }

    const endTime = startTime + durationMs;

    form.setValue('startTime', startTime);
    form.setValue('endTime', endTime);
  };

  // Initialize timer values on mount
  useEffect(() => {
    updateAuctionTimes();
  }, []);

  const addSpecies = () => {
    const updated: SpeciesBreakdown[] = [...speciesBreakdown, { species: "Stejar" as const, percentage: 0 }];
    setSpeciesBreakdown(updated);
    form.setValue("speciesBreakdown", updated);
  };

  const removeSpecies = (index: number) => {
    const updated = speciesBreakdown.filter((_, i) => i !== index);
    setSpeciesBreakdown(updated);
    form.setValue("speciesBreakdown", updated);
  };

  const updateSpecies = (index: number, field: "species" | "percentage", value: string | number) => {
    const updated = [...speciesBreakdown];
    if (field === "percentage") {
      updated[index].percentage = typeof value === "string" ? parseFloat(value) || 0 : value;
    } else {
      updated[index].species = value as typeof speciesTypes[number];
    }
    setSpeciesBreakdown(updated);
    form.setValue("speciesBreakdown", updated);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsOcrProcessing(true);

    try {
      const base64 = await fileToBase64(file);
      // Send the full data URL (includes mime type) to preserve image format
      const result = await apiRequest("POST", "/api/ocr/extract-apv", {
        imageBase64: base64,
      }) as ApvExtractionResult;

      setOcrResult(result);
      
      form.setValue("title", `${result.species} - ${result.upLocation}` || "");
      form.setValue("description", `Lot de lemn ${result.species}, UP: ${result.upLocation}, UA: ${result.uaLocation}, Volum: ${result.volumeM3} m³${result.dimensionalSorting ? `, Sortare: ${result.dimensionalSorting}` : ""}`);
      form.setValue("volumeM3", result.volumeM3);
      form.setValue("apvPermitNumber", result.permitNumber);
      form.setValue("apvUpLocation", result.upLocation);
      form.setValue("apvUaLocation", result.uaLocation);
      form.setValue("apvForestCompany", result.forestCompany);
      
      if (result.dateOfMarking) {
        form.setValue("apvDateOfMarking", result.dateOfMarking);
      }
      if (result.dimensionalSorting) {
        form.setValue("apvDimensionalSorting", result.dimensionalSorting);
      }
      if (result.volumePerSpecies) {
        form.setValue("apvVolumePerSpecies", result.volumePerSpecies);
      }
      if (result.numberOfTrees) {
        form.setValue("apvNumberOfTrees", result.numberOfTrees);
      }
      if (result.averageHeight) {
        form.setValue("apvAverageHeight", result.averageHeight);
      }
      if (result.averageDiameter) {
        form.setValue("apvAverageDiameter", result.averageDiameter);
      }
      if (result.netVolume) {
        form.setValue("apvNetVolume", result.netVolume);
      }
      if (result.grossVolume) {
        form.setValue("apvGrossVolume", result.grossVolume);
      }
      if (result.surfaceHa) {
        form.setValue("apvSurfaceHa", result.surfaceHa);
      }
      if (result.firewoodVolume) {
        form.setValue("apvFirewoodVolume", result.firewoodVolume);
      }
      if (result.barkVolume) {
        form.setValue("apvBarkVolume", result.barkVolume);
      }
      if (result.treatmentType) {
        form.setValue("apvTreatmentType", result.treatmentType);
      }
      if (result.extractionMethod) {
        form.setValue("apvExtractionMethod", result.extractionMethod);
      }
      if (result.sortVolumes) {
        form.setValue("apvSortVolumes", result.sortVolumes);
      }
      if (result.permitCode) {
        form.setValue("apvPermitCode", result.permitCode);
      }
      if (result.productType) {
        form.setValue("apvProductType", result.productType);
      }
      if (result.harvestYear) {
        form.setValue("apvHarvestYear", result.harvestYear);
      }
      if (result.inventoryMethod) {
        form.setValue("apvInventoryMethod", result.inventoryMethod);
      }
      if (result.hammerMark) {
        form.setValue("apvHammerMark", result.hammerMark);
      }
      if (result.accessibility) {
        form.setValue("apvAccessibility", result.accessibility);
      }
      if (result.averageAge) {
        form.setValue("apvAverageAge", result.averageAge);
      }
      if (result.slopePercent) {
        form.setValue("apvSlopePercent", result.slopePercent);
      }
      
      if (result.speciesBreakdown && result.speciesBreakdown.length > 0) {
        setSpeciesBreakdown(result.speciesBreakdown);
        form.setValue("speciesBreakdown", result.speciesBreakdown);
      }

      toast({
        title: "APV data extracted!",
        description: `Found ${result.volumeM3} m³ of ${result.species}${result.numberOfTrees ? ` (${result.numberOfTrees} trees)` : ""}`,
      });
    } catch (error: any) {
      console.error("OCR error:", error);
      toast({
        title: "Extraction failed",
        description: error.message || "Could not extract data from document. Please fill manually.",
        variant: "destructive",
      });
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Create draft auction to get ID for file uploads
  const createDraftAuction = async () => {
    if (draftAuctionId) return draftAuctionId;

    try {
      const response = await apiRequest("POST", "/api/auctions/draft", {});
      const id = response.id;
      setDraftAuctionId(id);
      return id;
    } catch (error) {
      console.error("Failed to create draft auction:", error);
      toast({
        title: "Error",
        description: "Failed to initialize document upload",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handlePublish = async () => {
    console.log("=== PUBLISH BUTTON CLICKED ===");
    console.log("Form errors:", form.formState.errors);
    console.log("Form values:", form.getValues());
    console.log("Is form valid?", form.formState.isValid);

    // Filter out empty species rows before validation
    const currentValues = form.getValues();
    const filteredSpecies = currentValues.speciesBreakdown?.filter(
      s => s.species && s.percentage > 0
    ) || [];

    // Update form with filtered species
    form.setValue('speciesBreakdown', filteredSpecies);

    // Trigger form submission
    await form.handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: InsertAuction) => {
    setIsSubmitting(true);
    try {
      const auctionData = {
        ...data,
        speciesBreakdown: speciesBreakdown.filter(s => s.percentage > 0),
        imageUrls: data.imageUrls || [],
        documentUrls: data.documentUrls || [],
        documents, // Add uploaded documents
        apvDocumentId, // Add APV document reference
      };
      console.log("Auction data:", auctionData);

      let auctionId = draftAuctionId;

      // If we have a draft auction (because documents were uploaded), update it
      if (draftAuctionId) {
        try {
          console.log("Updating draft auction:", draftAuctionId);
          await apiRequest("PUT", `/api/auctions/${draftAuctionId}`, {
            ...auctionData,
            status: isDraft ? "draft" : "upcoming"
          });
          console.log("Draft updated successfully");
        } catch (apiError: any) {
          console.log("API update failed:", apiError.message);
          throw apiError;
        }
      } else {
        // No draft auction, create new one
        try {
          console.log("Creating new auction...");
          const response = await apiRequest("POST", "/api/auctions", {
            ...auctionData,
            status: isDraft ? "draft" : "upcoming"
          });
          auctionId = response.id;
          console.log("API success, auction ID:", auctionId);
        } catch (apiError: any) {
          console.log("API failed, using Firestore directly:", apiError.message);
          const firestoreResult = await createAuctionFirestore(auctionData, isDraft ? "draft" : "upcoming");
          auctionId = firestoreResult.id;
          console.log("Firestore success, auction ID:", auctionId);
        }
      }

      toast({
        title: isDraft ? "Draft saved!" : "Listing created!",
        description: isDraft ? "Your auction has been saved as draft" : "Your auction is now live",
      });
      console.log("Redirecting to auction:", auctionId);
      setLocation(auctionId ? `/auction/${auctionId}` : "/dashboard");
    } catch (error: any) {
      console.error("Error creating auction:", error);
      toast({
        title: "Failed to create listing",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user data exists and user is a forest owner
  if (!userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Connection Error</h2>
            <p className="text-muted-foreground mb-4">Unable to load user data. Please refresh the page.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
              <Link href="/">
                <Button variant="outline">Back to Auctions</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userData.role !== "forest_owner") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">Only forest owners can create listings</p>
            <Link href="/">
              <Button>Back to Auctions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4 gap-2" data-testid="button-back">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Create Auction Listing</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="bg-muted/30">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Scan className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">Scan APV Permit (Optional)</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Upload your felling permit (APV) and we'll automatically extract the data
                        </p>
                        
                        {ocrResult && (
                          <Card className="mb-4 bg-primary/5">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-primary mt-0.5" />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm mb-2">APV Data Extracted</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Location:</span>
                                      <p className="font-medium">{ocrResult.upLocation}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Volume:</span>
                                      <p className="font-medium">{ocrResult.volumeM3} m³</p>
                                    </div>
                                    {ocrResult.surfaceHa && (
                                      <div>
                                        <span className="text-muted-foreground">Surface:</span>
                                        <p className="font-medium">{ocrResult.surfaceHa} ha</p>
                                      </div>
                                    )}
                                    {ocrResult.numberOfTrees && (
                                      <div>
                                        <span className="text-muted-foreground">Trees:</span>
                                        <p className="font-medium">{ocrResult.numberOfTrees}</p>
                                      </div>
                                    )}
                                    {ocrResult.dateOfMarking && (
                                      <div>
                                        <span className="text-muted-foreground">Marked:</span>
                                        <p className="font-medium">{ocrResult.dateOfMarking}</p>
                                      </div>
                                    )}
                                    {ocrResult.averageHeight && (
                                      <div>
                                        <span className="text-muted-foreground">Avg Height:</span>
                                        <p className="font-medium">{ocrResult.averageHeight} m</p>
                                      </div>
                                    )}
                                    {ocrResult.averageDiameter && (
                                      <div>
                                        <span className="text-muted-foreground">Avg Diameter:</span>
                                        <p className="font-medium">{ocrResult.averageDiameter} cm</p>
                                      </div>
                                    )}
                                    {ocrResult.netVolume && (
                                      <div>
                                        <span className="text-muted-foreground">Net Volume:</span>
                                        <p className="font-medium">{ocrResult.netVolume} m³</p>
                                      </div>
                                    )}
                                    {ocrResult.grossVolume && (
                                      <div>
                                        <span className="text-muted-foreground">Gross Volume:</span>
                                        <p className="font-medium">{ocrResult.grossVolume} m³</p>
                                      </div>
                                    )}
                                    {ocrResult.firewoodVolume && (
                                      <div>
                                        <span className="text-muted-foreground">Firewood:</span>
                                        <p className="font-medium">{ocrResult.firewoodVolume} m³</p>
                                      </div>
                                    )}
                                    {ocrResult.barkVolume && (
                                      <div>
                                        <span className="text-muted-foreground">Bark:</span>
                                        <p className="font-medium">{ocrResult.barkVolume} m³</p>
                                      </div>
                                    )}
                                    {ocrResult.treatmentType && (
                                      <div>
                                        <span className="text-muted-foreground">Treatment:</span>
                                        <p className="font-medium">{ocrResult.treatmentType}</p>
                                      </div>
                                    )}
                                    {ocrResult.extractionMethod && (
                                      <div>
                                        <span className="text-muted-foreground">Extraction:</span>
                                        <p className="font-medium">{ocrResult.extractionMethod}</p>
                                      </div>
                                    )}
                                    {ocrResult.permitCode && (
                                      <div>
                                        <span className="text-muted-foreground">Permit Code:</span>
                                        <p className="font-medium">{ocrResult.permitCode}</p>
                                      </div>
                                    )}
                                    {ocrResult.productType && (
                                      <div>
                                        <span className="text-muted-foreground">Product Type:</span>
                                        <p className="font-medium">{ocrResult.productType}</p>
                                      </div>
                                    )}
                                    {ocrResult.harvestYear && (
                                      <div>
                                        <span className="text-muted-foreground">Harvest Year:</span>
                                        <p className="font-medium">{ocrResult.harvestYear}</p>
                                      </div>
                                    )}
                                    {ocrResult.inventoryMethod && (
                                      <div>
                                        <span className="text-muted-foreground">Inventory Method:</span>
                                        <p className="font-medium">{ocrResult.inventoryMethod}</p>
                                      </div>
                                    )}
                                    {ocrResult.hammerMark && (
                                      <div>
                                        <span className="text-muted-foreground">Hammer Mark:</span>
                                        <p className="font-medium">{ocrResult.hammerMark}</p>
                                      </div>
                                    )}
                                    {ocrResult.accessibility && (
                                      <div>
                                        <span className="text-muted-foreground">Accessibility:</span>
                                        <p className="font-medium">{ocrResult.accessibility}</p>
                                      </div>
                                    )}
                                    {ocrResult.averageAge && (
                                      <div>
                                        <span className="text-muted-foreground">Avg Age:</span>
                                        <p className="font-medium">{ocrResult.averageAge} years</p>
                                      </div>
                                    )}
                                    {ocrResult.slopePercent && (
                                      <div>
                                        <span className="text-muted-foreground">Slope:</span>
                                        <p className="font-medium">{ocrResult.slopePercent}%</p>
                                      </div>
                                    )}
                                  </div>
                                  {ocrResult.sortVolumes && Object.keys(ocrResult.sortVolumes).length > 0 && (
                                    <div className="mt-2 pt-2 border-t">
                                      <span className="text-muted-foreground text-xs">Sort Volumes:</span>
                                      <div className="grid grid-cols-3 gap-2 mt-1">
                                        {Object.entries(ocrResult.sortVolumes).map(([sort, volume]) => (
                                          <div key={sort} className="text-xs">
                                            <span className="font-medium">{sort}:</span> {volume} m³
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {ocrResult.dimensionalSorting && !ocrResult.sortVolumes && (
                                    <div className="mt-2 pt-2 border-t">
                                      <span className="text-muted-foreground text-xs">Sorting:</span>
                                      <p className="text-xs font-medium mt-1">{ocrResult.dimensionalSorting}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            disabled={isOcrProcessing}
                            onClick={() => document.getElementById('apv-upload')?.click()}
                            data-testid="button-upload-apv"
                          >
                            {isOcrProcessing ? (
                              <>
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                Scanning...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                {uploadedFile ? "Change Document" : "Upload APV"}
                              </>
                            )}
                          </Button>
                          {uploadedFile && (
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {uploadedFile.name}
                            </span>
                          )}
                        </div>
                        <input
                          id="apv-upload"
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                          data-testid="input-apv-file"
                        />
                        
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            type="button"
                            variant="ghost"
                            className="gap-2 w-full justify-center"
                            onClick={() => setShowManualEntry(!showManualEntry)}
                            data-testid="button-toggle-manual-entry"
                          >
                            {showManualEntry ? "Hide" : "Enter"} APV Data Manually
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Manual APV Entry Section */}
                {showManualEntry && (
                  <Card className="bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-lg">Manual APV Data Entry</CardTitle>
                      <p className="text-sm text-muted-foreground">Enter permit details manually if OCR scan is unavailable</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Basic Information */}
                      <div>
                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Basic Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="apvPermitNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>APV Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="2967-ACCI-CUMPATU" {...field} data-testid="input-apv-permit-number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvPermitCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Permit Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="2500010900860" {...field} data-testid="input-apv-permit-code" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvUpLocation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Production Unit (UP)</FormLabel>
                                <FormControl>
                                  <Input placeholder="IX - CASA REGALA" {...field} data-testid="input-apv-up-location" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvUaLocation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>UA Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="45 A" {...field} data-testid="input-apv-ua-location" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvForestCompany"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Forest Company</FormLabel>
                                <FormControl>
                                  <Input placeholder="ASOCIAȚIA OCOLUL SILVIC EVER GREEN" {...field} data-testid="input-apv-forest-company" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvSurfaceHa"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Surface Area (ha)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    placeholder="3.75" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseFloat(val));
                                    }}
                                    data-testid="input-apv-surface-ha" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvTreatmentType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Treatment Type</FormLabel>
                                <FormControl>
                                  <Input placeholder="T. PRODUSE ACCIDENTALE I" {...field} data-testid="input-apv-treatment-type" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvProductType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product Type</FormLabel>
                                <FormControl>
                                  <Input placeholder="PRODUSE ACCIDENTALE" {...field} data-testid="input-apv-product-type" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvExtractionMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Extraction Method</FormLabel>
                                <FormControl>
                                  <Input placeholder="SORTIMENTE SI MULTIPLI" {...field} data-testid="input-apv-extraction-method" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvDateOfMarking"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inventory Date</FormLabel>
                                <FormControl>
                                  <Input placeholder="08.09.2025" {...field} data-testid="input-apv-date-marking" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvHarvestYear"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Harvest Year</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="2000"
                                    max="2100"
                                    step="1"
                                    placeholder="2025" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseInt(val));
                                    }}
                                    data-testid="input-apv-harvest-year" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvInventoryMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inventory Method</FormLabel>
                                <FormControl>
                                  <Input placeholder="FIR CU FIR" {...field} data-testid="input-apv-inventory-method" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvHammerMark"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hammer Mark</FormLabel>
                                <FormControl>
                                  <Input placeholder="DB1302" {...field} data-testid="input-apv-hammer-mark" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvAccessibility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Accessibility</FormLabel>
                                <FormControl>
                                  <Input placeholder="0-250" {...field} data-testid="input-apv-accessibility" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Tree & Forest Metrics */}
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Tree & Forest Metrics</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="apvNetVolume"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Net Volume (m³)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    placeholder="155.01" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseFloat(val));
                                    }}
                                    data-testid="input-apv-net-volume" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvGrossVolume"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gross Volume (m³)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    placeholder="256.57" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseFloat(val));
                                    }}
                                    data-testid="input-apv-gross-volume" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvNumberOfTrees"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Trees</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    step="1"
                                    placeholder="98" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseInt(val));
                                    }}
                                    data-testid="input-apv-number-trees" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvAverageDiameter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Avg. Diameter (cm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0"
                                    placeholder="50.5" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseFloat(val));
                                    }}
                                    data-testid="input-apv-avg-diameter" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvAverageHeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Avg. Height (m)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0"
                                    placeholder="25.5" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseFloat(val));
                                    }}
                                    data-testid="input-apv-avg-height" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvAverageAge"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Avg. Age (years)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    step="1"
                                    placeholder="120" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseInt(val));
                                    }}
                                    data-testid="input-apv-avg-age" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvSlopePercent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Slope (%)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    step="1"
                                    placeholder="15" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseInt(val));
                                    }}
                                    data-testid="input-apv-slope" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Volume Breakdown */}
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Volume Breakdown</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="apvFirewoodVolume"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Firewood Volume (m³)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    placeholder="81.05" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseFloat(val));
                                    }}
                                    data-testid="input-apv-firewood-volume" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvBarkVolume"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bark Volume (m³)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    placeholder="20.51" 
                                    value={field.value ?? ''} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      field.onChange(val === '' ? undefined : parseFloat(val));
                                    }}
                                    data-testid="input-apv-bark-volume" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="apvDimensionalSorting"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Dimensional Sorting</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="G1: 120.64mc, G2: 24.56mc, G3: 5.71mc, M1: 3.27mc, M2: 0.71mc" rows={3} {...field} data-testid="input-apv-dimensional-sorting" />
                                </FormControl>
                                <FormDescription>Enter sort volumes like: G1: 120.64mc, G2: 24.56mc, etc.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Premium oak forest lot in Maramureș"
                          {...field}
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide detailed information about the forest lot, accessibility, and any special characteristics..."
                          rows={4}
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-region">
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regions.map(region => (
                              <SelectItem key={region} value={region}>{region}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="City or nearest landmark"
                            {...field}
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="speciesBreakdown"
                  render={() => (
                    <FormItem>
                      <FormLabel>Species Breakdown</FormLabel>
                      <FormDescription>Total must equal 100%</FormDescription>
                      <div className="space-y-3">
                        {speciesBreakdown.map((item, index) => (
                          <div key={index} className="flex gap-3 items-start">
                            <Select
                              value={item.species}
                              onValueChange={(value) => updateSpecies(index, "species", value)}
                            >
                              <SelectTrigger className="flex-1" data-testid={`select-species-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {speciesTypes.map(species => (
                                  <SelectItem key={species} value={species}>{species}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder="%"
                              value={item.percentage || ""}
                              onChange={(e) => updateSpecies(index, "percentage", e.target.value)}
                              className="w-24"
                              min="0"
                              max="100"
                              step="0.01"
                              data-testid={`input-percentage-${index}`}
                            />
                            {item.volumeM3 !== undefined && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm font-medium min-w-[100px]">
                                {item.volumeM3} m³
                              </div>
                            )}
                            {speciesBreakdown.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeSpecies(index)}
                                data-testid={`button-remove-species-${index}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSpecies}
                          className="gap-2"
                          data-testid="button-add-species"
                        >
                          <Plus className="w-4 h-4" />
                          Add Species
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          Total: {parseFloat(speciesBreakdown.reduce((sum, s) => sum + s.percentage, 0).toFixed(2))}%
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="volumeM3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume (m³)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="500"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-volume"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startingPricePerM3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starting Price (€/m³)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-starting-price"
                          />
                        </FormControl>
                        <FormDescription>Price per cubic meter</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Manual Timer Control for Testing */}
                <Card className="bg-muted/30 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">⏱️</span>
                      Auction Timer (Testing)
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Set custom auction duration for testing the lifecycle automation
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Start In (minutes)</label>
                      <Input
                        type="number"
                        min="0"
                        value={startInMinutes}
                        onChange={(e) => {
                          setStartInMinutes(parseInt(e.target.value) || 0);
                          setTimeout(updateAuctionTimes, 0);
                        }}
                        placeholder="1"
                        data-testid="input-start-in-minutes"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Auction will start in {startInMinutes} minute{startInMinutes !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Duration</label>
                        <Input
                          type="number"
                          min="1"
                          value={durationValue}
                          onChange={(e) => {
                            setDurationValue(parseInt(e.target.value) || 1);
                            setTimeout(updateAuctionTimes, 0);
                          }}
                          placeholder="7"
                          data-testid="input-duration-value"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Unit</label>
                        <Select
                          value={durationUnit}
                          onValueChange={(value: 'minutes' | 'hours' | 'days') => {
                            setDurationUnit(value);
                            setTimeout(updateAuctionTimes, 0);
                          }}
                        >
                          <SelectTrigger data-testid="select-duration-unit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Alert>
                      <AlertDescription>
                        <strong>Auction Schedule:</strong>
                        <div className="mt-2 space-y-1 text-sm">
                          <div>• Starts: {new Date(form.watch('startTime')).toLocaleString()}</div>
                          <div>• Ends: {new Date(form.watch('endTime')).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground mt-2">
                            💡 Set to 2-3 minutes for quick testing of auction end and winner settlement
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Document Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <FormLabel className="mb-2 block">APV Document (Required)</FormLabel>
                      <FormDescription className="mb-4 text-xs">
                        Upload the official APV (Aviz de Punere in Valoare) document for this auction
                      </FormDescription>
                      {!documents.some(d => d.isApvDocument) ? (
                        draftAuctionId ? (
                          <DocumentUploader
                            auctionId={draftAuctionId}
                            onUploadComplete={async (doc) => {
                              // Mark as APV document
                              const apvDoc = { ...doc, isApvDocument: true };
                              setDocuments(prev => [...prev, apvDoc]);
                              setApvDocumentId(doc.id);
                            }}
                            maxFiles={1}
                            accept=".pdf"
                            allowedTypes={["application/pdf"]}
                            disabled={!userData}
                          />
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={async () => {
                              await createDraftAuction();
                            }}
                          >
                            Click to Enable Document Upload
                          </Button>
                        )
                      ) : (
                        <div className="space-y-2">
                          {documents.filter(d => d.isApvDocument).map(doc => (
                            <DocumentCard
                              key={doc.id}
                              document={doc}
                              showDelete
                              onDelete={async () => {
                                await deleteDocument(doc.storagePath);
                                setDocuments(prev => prev.filter(d => d.id !== doc.id));
                                setApvDocumentId(undefined);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <FormLabel className="mb-2 block">Additional Documents (Optional)</FormLabel>
                      <FormDescription className="mb-4 text-xs">
                        Upload photos, maps, or additional documentation (PDF, JPG, PNG)
                      </FormDescription>
                      {draftAuctionId ? (
                        <DocumentUploader
                          auctionId={draftAuctionId}
                          onUploadComplete={async (doc) => {
                            setDocuments(prev => [...prev, doc]);
                          }}
                          maxFiles={10}
                          disabled={!userData}
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={async () => {
                            await createDraftAuction();
                          }}
                        >
                          Click to Enable Document Upload
                        </Button>
                      )}
                      {documents.filter(d => !d.isApvDocument).length > 0 && (
                        <div className="space-y-2 mt-4">
                          {documents.filter(d => !d.isApvDocument).map(doc => (
                            <DocumentCard
                              key={doc.id}
                              document={doc}
                              showDelete
                              compact
                              onDelete={async () => {
                                await deleteDocument(doc.storagePath);
                                setDocuments(prev => prev.filter(d => d.id !== doc.id));
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                    onClick={() => setIsDraft(true)}
                    data-testid="button-save-draft"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting}
                    onClick={() => {
                      handlePublish();
                      setIsDraft(false);
                    }}
                    data-testid="button-publish"
                  >
                    {isSubmitting ? "Publishing..." : "Publish Auction"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
