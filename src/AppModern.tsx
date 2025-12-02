import StepByStepFlow from './components/StepByStepFlow';
import MapView from './components/MapView';
import TopBar from './components/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Loader2, Route, Map, Download } from "lucide-react";
import { cn } from "./lib/utils";
import { useStep2, useStep3, useStep5, useInputs } from './store';
import { useT } from './i18n';
import './tailwind.css';

export default function AppModern() {
  const { language } = useInputs();
  const t = useT(language);
  const step2 = useStep2();
  const step3 = useStep3();
  const step5 = useStep5();

  // Check if steps are enabled based on current state
  const isSequencingEnabled = true; // Always enabled after Step 1
  const isRoutingEnabled = step2?.orderedPreview !== null;
  const isExportEnabled = step3?.routingArtifact !== null;
  
  // Show loading state for all actions
  const isSequencingRunning = step2?.isProcessing || false;
  const isRoutingRunning = step3?.isRunningStep3 || false;
  const isExportRunning = step5?.isExporting || false;
  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="w-full">
        <div className="mx-auto w-full max-w-none sm:max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-4rem)] lg:max-w-[calc(100vw-8rem)] xl:max-w-[calc(100vw-12rem)] 2xl:max-w-[1269px] px-4 sm:px-5 lg:px-8 py-6">
          {/* Adjusted proportions for better button visibility */}
          <div className="grid gap-4 lg:grid-cols-[5fr_7fr] items-start">
            {/* LEFT column: inputs + actions */}
            <div className="space-y-6">
              <StepByStepFlow />
              
              {/* Actions: side-by-side buttons */}
              <Card className="rounded-2xl">
                <CardContent className="p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button 
                      variant="outline"
                      size="lg"
                      className={cn(
                        "h-11 transition-colors min-w-[140px] px-3",
                        "border border-border hover:border-foreground/40",
                        isSequencingRunning && "border-2 border-primary ring-1 ring-primary/30"
                      )}
                      disabled={!isSequencingEnabled || isSequencingRunning}
                      data-selected={isSequencingRunning ? "true" : "false"}
                      onClick={() => {
                        // Trigger the Step2Wps sequencing by finding and clicking its hidden button
                        const step2Button = document.querySelector('[data-step2-trigger]') as HTMLButtonElement;
                        if (step2Button) {
                          step2Button.click();
                        }
                      }}
                    >
                      {isSequencingRunning ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("sequencing")}</>
                      ) : (
                        <><Route className="w-4 h-4 mr-2" />{t("sequencing")}</>
                      )}
                    </Button>

                    <Button 
                      variant="outline"
                      size="lg"
                      className={cn(
                        "h-11 transition-colors min-w-[140px] px-3",
                        "border border-border hover:border-foreground/40",
                        isRoutingRunning && "border-2 border-primary ring-1 ring-primary/30"
                      )}
                      disabled={!isRoutingEnabled || isRoutingRunning}
                      data-selected={isRoutingRunning ? "true" : "false"}
                      onClick={() => {
                        // Trigger the Step3Routing by finding and clicking its hidden button
                        const step3Button = document.querySelector('[data-step3-trigger]') as HTMLButtonElement;
                        if (step3Button) {
                          step3Button.click();
                        }
                      }}
                    >
                      {isRoutingRunning ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("routing")}</>
                      ) : (
                        <><Map className="w-4 h-4 mr-2" />{t("routing")}</>
                      )}
                    </Button>

                    <Button 
                      variant="outline"
                      size="lg"
                      className={cn(
                        "h-11 transition-colors min-w-[140px] px-3",
                        "border border-border hover:border-foreground/40",
                        isExportRunning && "border-2 border-primary ring-1 ring-primary/30"
                      )}
                      disabled={!isExportEnabled || isExportRunning}
                      data-selected={isExportRunning ? "true" : "false"}
                      onClick={() => {
                        // Trigger the Step5Gpx export by finding and clicking its hidden button
                        const step5Button = document.querySelector('[data-step5-trigger]') as HTMLButtonElement;
                        if (step5Button) {
                          step5Button.click();
                        }
                      }}
                    >
                      {isExportRunning ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("exportGpx")}</>
                      ) : (
                        <><Download className="w-4 h-4 mr-2" />{t("exportGpx")}</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Route Information Card - Show after routing or during routing */}
              {(step3.routingArtifact || isRoutingRunning) && (
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      {t("routeInformation")}
                      {isRoutingRunning && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isRoutingRunning && !step3.routingArtifact ? (
                      <div className="text-sm text-muted-foreground animate-pulse">
                        Calculating optimal route...
                      </div>
                    ) : step3.routingArtifact ? (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("totalStops")}:</span>
                          <span className="font-medium">{step3.routingArtifact.via_count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("distance")}:</span>
                          <span className="font-medium">
                            {(step3.routingArtifact.totals.length_m / 1000).toFixed(1)} km
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("time")}:</span>
                          <span className="font-medium">
                            {Math.floor(step3.routingArtifact.totals.duration_s / 3600)}h {Math.floor((step3.routingArtifact.totals.duration_s % 3600) / 60)}m
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT column: map only */}
            <section className="space-y-6 min-w-0">
              {/* Map */}
              <Card className="rounded-2xl">
                <CardContent className="p-3 md:p-4">
                  <div id="map-root" className="w-full h-[68vh] md:h-[76vh] lg:h-[78vh] rounded-xl overflow-hidden">
                    <MapView /> {/* MapView must render ONLY the map container */}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
