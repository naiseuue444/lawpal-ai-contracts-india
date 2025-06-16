
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Upload as UploadIcon, FileText, Globe, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Upload = () => {
  const [language, setLanguage] = useState('en');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const content = {
    en: {
      title: "Upload Contract for Analysis",
      subtitle: "Get instant AI-powered legal insights",
      fileLabel: "Select Contract File",
      uploadBtn: "Analyze Contract",
      supportedFormats: "Supported: PDF, DOCX (Max 10MB)",
      backToDashboard: "Back to Dashboard"
    },
    hi: {
      title: "विश्लेषण के लिए अनुबंध अपलोड करें",
      subtitle: "तुरंत एआई-संचालित कानूनी अंतर्दृष्टि प्राप्त करें",
      fileLabel: "अनुबंध फ़ाइल चुनें",
      uploadBtn: "अनुबंध का विश्लेषण करें",
      supportedFormats: "समर्थित: PDF, DOCX (अधिकतम 10MB)",
      backToDashboard: "डैशबोर्ड पर वापस जाएं"
    }
  };

  const t = content[language];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOCX file",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    try {
      console.log('Starting upload process...');
      
      // First, get the user's profile to get the user_id
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile error:', profileError);
        throw new Error('User profile not found. Please try logging out and back in.');
      }

      console.log('User profile found:', userProfile.id);

      // Create contract record
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          user_id: userProfile.id,
          filename: file.name,
          file_size: file.size,
          analysis_status: 'pending'
        })
        .select()
        .single();

      if (contractError) {
        console.error('Contract creation error:', contractError);
        throw contractError;
      }

      console.log('Contract created:', contract.id);

      // Convert file to base64
      const base64File = await fileToBase64(file);
      console.log('File converted to base64, length:', base64File.length);

      // Start contract analysis
      console.log('Calling analyze-contract function...');
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-contract', {
        body: JSON.stringify({ 
          contractId: contract.id,
          file: base64File
        })
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        // Update contract status to failed
        await supabase
          .from('contracts')
          .update({ analysis_status: 'failed' })
          .eq('id', contract.id);
        
        throw new Error('Analysis failed: ' + analysisError.message);
      }

      console.log('Analysis result:', analysisResult);

      toast({
        title: "Contract uploaded successfully!",
        description: "Analysis is complete. Check your dashboard for results.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">LawPal AI</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="flex items-center space-x-1"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'en' ? 'हिं' : 'EN'}</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.backToDashboard}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>

          <Card className="bg-white/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UploadIcon className="h-5 w-5 text-blue-600" />
                <span>{t.fileLabel}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="contract-file">{t.fileLabel}</Label>
                <Input
                  id="contract-file"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-sm text-gray-500">{t.supportedFormats}</p>
              </div>

              {file && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">AI-Powered Analysis</p>
                    <p>Your contract will be analyzed using advanced AI to identify key clauses, risks, and provide legal insights in both English and Hindi.</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isUploading ? "Analyzing..." : t.uploadBtn}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Upload;
