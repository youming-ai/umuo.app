/**
 * Troubleshooting System Demo Component
 *
 * A demonstration component showing how to use the troubleshooting guidance system.
 * This component showcases the integration of symptom checking, guided resolution,
 * knowledge base access, and analytics tracking.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useTroubleshootingSession,
  useKnowledgeBase,
  useSymptomChecker,
  useQuickTroubleshooting,
  SymptomCategory,
  SuccessMetrics,
} from '@/lib/errors/troubleshooting';

interface TroubleshootingDemoProps {
  className?: string;
}

/**
 * Main troubleshooting demo component
 */
export function TroubleshootingDemo({ className }: TroubleshootingDemoProps) {
  const [selectedError, setSelectedError] = useState('audio_no_sound');
  const [demoMode, setDemoMode] = useState<'guided' | 'symptom' | 'knowledge'>('guided');

  // Quick start with audio error
  const { session, startSession, analyzeSymptoms, getGuides, progress, isReady } =
    useQuickTroubleshooting('demo_audio_error', 'AUDIO_NO_SOUND');

  // Knowledge base for searching
  const { search, getFAQs, getPopular } = useKnowledgeBase();

  // Symptom checker
  const { questions, analyzeAnswers } = useSymptomChecker();

  // State for demo
  const [symptomAnswers, setSymptomAnswers] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [faqs, setFAQs] = useState<any[]>([]);
  const [popularGuides, setPopularGuides] = useState<any[]>([]);

  // Demo errors
  const demoErrors = [
    { id: 'audio_no_sound', name: 'No Audio During Playback', category: 'Audio' },
    { id: 'file_upload_fails', name: 'File Upload Fails', category: 'File Management' },
    { id: 'transcription_fails', name: 'Transcription Fails', category: 'Transcription' },
    { id: 'network_connection_lost', name: 'Network Connection Lost', category: 'Network' },
    { id: 'mobile_battery_drain', name: 'Mobile Battery Drain', category: 'Mobile' },
  ];

  // Handle symptom analysis
  const handleSymptomAnalysis = async () => {
    try {
      const analysis = await analyzeAnswers(symptomAnswers);
      console.log('Symptom analysis:', analysis);
    } catch (error) {
      console.error('Symptom analysis failed:', error);
    }
  };

  // Handle knowledge base search
  const handleSearch = async () => {
    try {
      const results = await search(searchQuery, undefined, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Load FAQs
  React.useEffect(() => {
    const loadFAQs = async () => {
      try {
        const faqData = await getFAQs(undefined, 10);
        setFAQs(faqData);
      } catch (error) {
        console.error('Failed to load FAQs:', error);
      }
    };
    loadFAQs();
  }, [getFAQs]);

  // Load popular guides
  React.useEffect(() => {
    const loadPopular = async () => {
      try {
        const popular = await getPopular(undefined, 5);
        setPopularGuides(popular);
      } catch (error) {
        console.error('Failed to load popular guides:', error);
      }
    };
    loadPopular();
  }, [getPopular]);

  // Start troubleshooting session
  React.useEffect(() => {
    if (demoMode === 'guided' && isReady && !session) {
      startSession(selectedError, selectedError.toUpperCase());
    }
  }, [demoMode, isReady, session, startSession, selectedError]);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Troubleshooting System Demo</h1>
        <p className="text-muted-foreground">
          Interactive demonstration of the troubleshooting guidance system
        </p>
      </div>

      {/* Error Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Error to Troubleshoot</CardTitle>
          <CardDescription>
            Choose an error type to see how the troubleshooting system handles different issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoErrors.map((error) => (
              <Button
                key={error.id}
                variant={selectedError === error.id ? 'default' : 'outline'}
                onClick={() => setSelectedError(error.id)}
                className="h-auto p-4 flex flex-col items-start space-y-2"
              >
                <div className="font-medium">{error.name}</div>
                <Badge variant="secondary">{error.category}</Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Demo Interface */}
      <Tabs value={demoMode} onValueChange={(value) => setDemoMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="guided">Guided Resolution</TabsTrigger>
          <TabsTrigger value="symptom">Symptom Checker</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>

        {/* Guided Resolution Tab */}
        <TabsContent value="guided" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Guided Troubleshooting Session</CardTitle>
              <CardDescription>
                Interactive wizard that guides you through step-by-step resolution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {session && progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress.percentage)}%</span>
                  </div>
                  <Progress value={progress.percentage} />
                  <p className="text-sm text-muted-foreground">
                    Current: {progress.currentStepTitle}
                  </p>
                </div>
              )}

              {session ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle>Active Session</AlertTitle>
                    <AlertDescription>
                      Session ID: {session.id.substring(0, 8)}...
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => analyzeSymptoms({
                        device_volume: true,
                        other_apps_audio: true,
                        headphones: false,
                        browser_permissions: 'unknown',
                      })}
                    >
                      Analyze Symptoms
                    </Button>
                    <Button onClick={() => getGuides()} variant="outline">
                      Get Recommended Guides
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Initializing troubleshooting session...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Symptom Checker Tab */}
        <TabsContent value="symptom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Symptom Analysis</CardTitle>
              <CardDescription>
                Answer questions to identify specific symptoms and get targeted help
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Audio Questions */}
                <div className="space-y-4">
                  <h3 className="font-medium">Audio Playback</h3>

                  <div className="space-y-2">
                    <Label>Can you hear audio in other applications?</Label>
                    <RadioGroup
                      value={symptomAnswers.other_apps_audio?.toString()}
                      onValueChange={(value) =>
                        setSymptomAnswers({ ...symptomAnswers, other_apps_audio: value === 'true' })
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="other_apps_yes" />
                        <Label htmlFor="other_apps_yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="other_apps_no" />
                        <Label htmlFor="other_apps_no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Is your device volume turned up?</Label>
                    <RadioGroup
                      value={symptomAnswers.device_volume?.toString()}
                      onValueChange={(value) =>
                        setSymptomAnswers({ ...symptomAnswers, device_volume: value === 'true' })
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="volume_yes" />
                        <Label htmlFor="volume_yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="volume_no" />
                        <Label htmlFor="volume_no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Network Questions */}
                <div className="space-y-4">
                  <h3 className="font-medium">Network Connection</h3>

                  <div className="space-y-2">
                    <Label>Can you browse other websites?</Label>
                    <RadioGroup
                      value={symptomAnswers.can_browse_other_sites?.toString()}
                      onValueChange={(value) =>
                        setSymptomAnswers({ ...symptomAnswers, can_browse_other_sites: value === 'true' })
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="browse_yes" />
                        <Label htmlFor="browse_yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="browse_no" />
                        <Label htmlFor="browse_no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Connection type</Label>
                    <Select
                      value={symptomAnswers.connection_type}
                      onValueChange={(value) =>
                        setSymptomAnswers({ ...symptomAnswers, connection_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select connection type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wifi">WiFi</SelectItem>
                        <SelectItem value="cellular">Cellular (4G/5G)</SelectItem>
                        <SelectItem value="ethernet">Ethernet</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={handleSymptomAnalysis} className="w-full">
                Analyze Symptoms
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Search</CardTitle>
              <CardDescription>
                Search our comprehensive knowledge base for guides and solutions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search for help topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSearch}>Search</Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Search Results</h3>
                  {searchResults.map((result) => (
                    <div key={result.id} className="p-3 border rounded-lg">
                      <h4 className="font-medium">{result.title}</h4>
                      <p className="text-sm text-muted-foreground">{result.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {result.tags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Popular FAQs */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.id} className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">{faq.question}</h4>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline">{faq.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {faq.helpfulCount} found helpful
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analytics Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Analytics</CardTitle>
          <CardDescription>
            Real-time metrics and insights about troubleshooting effectiveness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">87%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">4.2</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">234</div>
              <div className="text-sm text-muted-foreground">Sessions Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">8.5</div>
              <div className="text-sm text-muted-foreground">Avg. Time (min)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Troubleshooting Button Component
 *
 * Simple button to trigger troubleshooting for a specific error
 */
interface TroubleshootButtonProps {
  errorId: string;
  errorCode?: string;
  errorMessage?: string;
  className?: string;
}

export function TroubleshootButton({
  errorId,
  errorCode,
  errorMessage,
  className
}: TroubleshootButtonProps) {
  const { startSession, session } = useTroubleshootingSession();

  const handleTroubleshoot = async () => {
    try {
      await startSession(errorId, errorCode);
    } catch (error) {
      console.error('Failed to start troubleshooting:', error);
    }
  };

  return (
    <Button
      onClick={handleTroubleshoot}
      variant="outline"
      size="sm"
      className={className}
      disabled={!!session}
    >
      {session ? 'Troubleshooting Active' : 'Troubleshoot Issue'}
    </Button>
  );
}

/**
 * Error with Troubleshooting Component
 *
 * Enhanced error display that includes troubleshooting options
 */
interface ErrorWithTroubleshootingProps {
  error: Error;
  showTroubleshooting?: boolean;
  className?: string;
}

export function ErrorWithTroubleshooting({
  error,
  showTroubleshooting = true,
  className
}: ErrorWithTroubleshootingProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <Alert variant="destructive">
        <AlertTitle>{error.name}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>

      {showTroubleshooting && (
        <div className="flex space-x-2">
          <TroubleshootButton
            errorId={error.name}
            errorCode={(error as any).code}
            errorMessage={error.message}
          />
        </div>
      )}
    </div>
  );
}

export default TroubleshootingDemo;
