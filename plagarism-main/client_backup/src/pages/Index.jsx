import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileSearch, AlertCircle, FileUp, X, Brain } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { checkTextSchema } from "../../../shared/schema";

const Index = () => {
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkingMode, setCheckingMode] = useState("");
  const [result, setResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const {
    toast
  } = useToast();

  const handleFileChange = event => {
    const file = event.target.files?.[0] || null;
    setPdfFile(file);
    if (file) {
      setText("");
    }
  };

  const validateInput = mode => {
    if (!pdfFile && !text.trim()) {
      return "Please upload a PDF or enter some text to check";
    }

    if (!pdfFile) {
      if (mode === "plagiarism") {
        const validation = checkTextSchema.safeParse({
          text
        });
        if (!validation.success) {
          return validation.error.errors[0]?.message || "Validation failed";
        }
      }
    } else {
      const isPdfType = pdfFile.type === "application/pdf" || pdfFile.name.toLowerCase().endsWith(".pdf");
      if (!isPdfType) {
        return "Only PDF files are supported";
      }
      if (pdfFile.size > 10 * 1024 * 1024) {
        return "PDF size must be 10MB or less";
      }
    }

    return "";
  };

  const handleCheck = async mode => {
    const validationError = validateInput(mode);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    setCheckingMode(mode);
    if (mode === "plagiarism") {
      setResult(null);
    } else {
      setAiResult(null);
    }

    try {
      let response;
      if (pdfFile) {
        const formData = new FormData();
        formData.append("file", pdfFile);
        response = await fetch(mode === "plagiarism" ? '/api/plagiarism-check-pdf' : '/api/ai-content-check-pdf', {
          method: 'POST',
          body: formData
        });
      } else {
        response = await fetch(mode === "plagiarism" ? '/api/plagiarism-check' : '/api/ai-content-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text
          })
        });
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || errorBody.message || 'Failed to check plagiarism');
      }

      const data = await response.json();
      if (mode === "plagiarism") {
        setResult(data);
        toast({
          title: "Plagiarism Check Complete",
          description: `Plagiarism score: ${data.plagiarismPercentage}%`
        });
      } else {
        setAiResult(data);
        toast({
          title: "AI Detection Complete",
          description: `AI probability: ${data.aiProbability}%`
        });
      }
    } catch (error) {
      console.error(`Error checking ${mode}:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to check ${mode}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
      setCheckingMode("");
    }
  };

  const getScoreColor = score => {
    if (score < 20) return "text-green-600 dark:text-green-400";
    if (score < 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAiColor = probability => {
    if (probability < 45) return "text-green-600 dark:text-green-400";
    if (probability < 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <FileSearch className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Academic Integrity Analyzer
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Plagiarism detection plus AI-content detection using NLP stylometry
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-2" data-testid="card-input">
            <CardHeader>
            <CardTitle>Enter Your Text</CardTitle>
              <CardDescription>
                Upload a PDF (text is extracted, images ignored) or paste text directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border-2 border-dashed rounded-md bg-background/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileUp className="h-4 w-4" />
                  <p className="text-sm font-semibold">Upload PDF</p>
                </div>
                <Input data-testid="input-pdf-file" type="file" accept=".pdf,application/pdf" onChange={handleFileChange} />
                {pdfFile && <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate" data-testid="text-selected-pdf">{pdfFile.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPdfFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>}
              </div>

              <Textarea data-testid="input-text" placeholder="Or paste your text here (minimum 100 characters)..." value={text} onChange={e => {
              setText(e.target.value);
              if (e.target.value.trim()) setPdfFile(null);
            }} className="min-h-[200px] text-base" />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground" data-testid="text-character-count">
                  {pdfFile ? `${pdfFile.size} bytes selected` : `${text.length} characters`}
                </p>
                <div className="flex gap-2">
                  <Button data-testid="button-check-plagiarism" onClick={() => handleCheck("plagiarism")} disabled={isChecking || (!pdfFile && text.length < 100)} size="lg">
                    {isChecking && checkingMode === "plagiarism" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isChecking && checkingMode === "plagiarism" ? "Checking..." : "Check Plagiarism"}
                  </Button>
                  <Button data-testid="button-check-ai-content" variant="secondary" onClick={() => handleCheck("ai")} disabled={isChecking || (!pdfFile && text.trim().length === 0)} size="lg">
                    {isChecking && checkingMode === "ai" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                    {isChecking && checkingMode === "ai" ? "Analyzing..." : "Detect AI Content"}
                  </Button>
                </div>
              </div>

              {isChecking && <Alert data-testid="alert-checking">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {checkingMode === "plagiarism" ? "This may take 30-60 seconds as we search the web and compare your text..." : "Analyzing NLP stylometric signals in your writing..."}
                  </AlertDescription>
                </Alert>}
            </CardContent>
          </Card>

          {result && <div className="mt-8 space-y-6">
              <Card className="shadow-xl border-2" data-testid="card-report">
                <CardHeader>
                  <CardTitle>Plagiarism Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-secondary rounded-md">
                      <p className="text-sm text-muted-foreground mb-2">Overall Plagiarism</p>
                      <p className={`text-5xl font-bold ${getScoreColor(result.plagiarismPercentage)}`} data-testid="text-plagiarism-percentage">
                        {result.plagiarismPercentage}%
                      </p>
                    </div>
                    <div className="text-center p-6 bg-secondary rounded-md">
                      <p className="text-sm text-muted-foreground mb-2">Similarity Score</p>
                      <p className={`text-5xl font-bold ${getScoreColor(result.overallScore)}`} data-testid="text-overall-score">
                        {result.overallScore}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sentences Analyzed</span>
                      <span className="font-semibold" data-testid="text-total-sentences">{result.totalSentences}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Plagiarized Sentences</span>
                      <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-plagiarized-sentences">{result.plagiarizedSentences}</span>
                    </div>
                    <Progress value={result.plagiarizedSentences / result.totalSentences * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-2" data-testid="card-details">
                <CardHeader>
                  <CardTitle>Detailed Results</CardTitle>
                  <CardDescription>Sentence-by-sentence analysis with sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.results.map((item, index) => <div key={index} data-testid={`result-sentence-${index}`} className={`p-4 rounded-md border-2 ${item.isPlagiarized ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"}`}>
                        <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                          <p className="text-sm font-medium flex-1" data-testid={`text-sentence-${index}`}>{item.sentence}</p>
                          <span data-testid={`badge-similarity-${index}`} className={`px-3 py-1 rounded-full text-sm font-bold ${item.isPlagiarized ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
                            {item.similarity}%
                          </span>
                        </div>
                        {item.sources.length > 0 && <div className="mt-2 pt-2 border-t border-current/20">
                            <p className="text-xs font-semibold mb-1">Potential Sources:</p>
                            <div className="space-y-1">
                              {item.sources.map((source, idx) => <div key={idx} className="flex items-start gap-2">
                                  <a href={source.url} target="_blank" rel="noopener noreferrer" data-testid={`link-source-${index}-${idx}`} className={`flex-1 text-xs hover:underline truncate ${source.similarity >= 50 ? "text-red-600 dark:text-red-400 font-semibold" : "text-orange-600 dark:text-orange-400"}`}>
                                    {source.url}
                                  </a>
                                  <span className={`text-xs font-bold ${source.similarity >= 50 ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`} data-testid={`text-source-similarity-${index}-${idx}`}>
                                    {source.similarity}%
                                  </span>
                                </div>)}
                            </div>
                          </div>}
                      </div>)}
                  </div>
                </CardContent>
              </Card>
            </div>}

          {aiResult && <div className="mt-8 space-y-6">
              <Card className="shadow-xl border-2" data-testid="card-ai-report">
                <CardHeader>
                  <CardTitle>AI Content Detection Report</CardTitle>
                  <CardDescription>{aiResult.summary}</CardDescription>
                  {aiResult.extractionStatus === "no_text_found_possible_scanned_pdf" && <p className="text-xs text-amber-600 dark:text-amber-400">
                      No text was extracted from this PDF. It may be scanned/image-only, so OCR is needed for accurate AI detection.
                    </p>}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-secondary rounded-md">
                      <p className="text-sm text-muted-foreground mb-2">AI Probability</p>
                      <p className={`text-5xl font-bold ${getAiColor(aiResult.aiProbability)}`} data-testid="text-ai-probability">
                        {aiResult.aiProbability}%
                      </p>
                    </div>
                    <div className="text-center p-6 bg-secondary rounded-md">
                      <p className="text-sm text-muted-foreground mb-2">Confidence</p>
                      <p className="text-5xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-ai-confidence">
                        {aiResult.confidence}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Classification</span>
                      <span className="font-semibold capitalize" data-testid="text-ai-classification">
                        {aiResult.classification.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Words / Sentences</span>
                      <span className="font-semibold" data-testid="text-ai-counts">
                        {aiResult.metrics.tokenCount} / {aiResult.metrics.sentenceCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {aiResult.providers?.length > 0 && <Card className="shadow-xl border-2" data-testid="card-ai-providers">
                  <CardHeader>
                    <CardTitle>Detector Providers</CardTitle>
                    <CardDescription>Ensemble uses all configured providers and local stylometry</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiResult.providers.map((provider, idx) => <div key={idx} className="p-3 border rounded-md bg-secondary/20" data-testid={`ai-provider-${idx}`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{provider.label}</p>
                            <p className="text-xs text-muted-foreground">{provider.latencyMs != null ? `${provider.latencyMs} ms` : "-"}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1 text-sm">
                            <span className={`capitalize ${provider.status === "ok" ? "text-green-600 dark:text-green-400" : provider.status === "error" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`}>{provider.status}</span>
                            <span className="font-semibold">{provider.score != null ? `${provider.score}%` : "-"}</span>
                          </div>
                          {provider.reason && <p className="text-xs text-muted-foreground mt-1">{provider.reason}</p>}
                        </div>)}
                    </div>
                  </CardContent>
                </Card>}

              {aiResult.indicators?.length > 0 && <Card className="shadow-xl border-2" data-testid="card-ai-indicators">
                  <CardHeader>
                    <CardTitle>NLP Indicators</CardTitle>
                    <CardDescription>Stylometric and entropy-based signals used for detection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiResult.indicators.map((indicator, idx) => <div key={idx} className="p-3 border rounded-md bg-secondary/30" data-testid={`ai-indicator-${idx}`}>
                          <div className="flex justify-between gap-2">
                            <span className="text-sm font-semibold">{indicator.name}</span>
                            <span className="text-sm font-bold">{indicator.value}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{indicator.note}</p>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>}
            </div>}
        </div>
      </div>
    </div>;
};
export default Index;
