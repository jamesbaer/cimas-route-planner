import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Route, Map, FileDown, Loader2 } from 'lucide-react';
import { useStep2, useStep3, useStep5 } from '../store';

export default function ActionsCard() {
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
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline"
          size="lg"
          className="w-full h-14 justify-start gap-2"
          disabled={!isSequencingEnabled || isSequencingRunning}
          onClick={() => {
            // Trigger the Step2Wps sequencing by finding and clicking its hidden button
            const step2Button = document.querySelector('[data-step2-trigger]') as HTMLButtonElement;
            if (step2Button) {
              step2Button.click();
            }
          }}
        >
          {isSequencingRunning ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Running Sequencing...</>
          ) : (
            <><Route className="w-5 h-5" /> Sequencing (WPS)</>
          )}
        </Button>

        <Button 
          variant="outline"
          size="lg"
          className="w-full h-14 justify-start gap-2"
          disabled={!isRoutingEnabled || isRoutingRunning}
          onClick={() => {
            // Trigger the Step3Routing by finding and clicking its hidden button
            const step3Button = document.querySelector('[data-step3-trigger]') as HTMLButtonElement;
            if (step3Button) {
              step3Button.click();
            }
          }}
        >
          {isRoutingRunning ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Running Routing...</>
          ) : (
            <><Map className="w-5 h-5" /> Routing</>
          )}
        </Button>

        <Button 
          variant="outline"
          size="lg"
          className="w-full h-14 justify-start gap-2"
          disabled={!isExportEnabled || isExportRunning}
          onClick={() => {
            // Trigger the Step5Gpx export by finding and clicking its hidden button
            const step5Button = document.querySelector('[data-step5-trigger]') as HTMLButtonElement;
            if (step5Button) {
              step5Button.click();
            }
          }}
        >
          {isExportRunning ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Exporting GPX...</>
          ) : (
            <><FileDown className="w-5 h-5" /> Export GPX</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
