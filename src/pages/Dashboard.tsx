import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  User,
  BarChart,
  Settings,
  Globe,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Contract {
  id: string;
  filename: string;
  upload_date: string;
  analysis_status: string;
  risk_score: string | null;
}

const Dashboard = () => {
  const [language, setLanguage] = useState('en');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const content = {
    en: {
      welcome: "Welcome back!",
      uploadNew: "Upload New Contract",
      recentContracts: "Recent Contract Analysis",
      quickStats: "Quick Stats",
      plan: "Current Plan: Solo Lawyer",
      statsLabels: {
        total: "Total Contracts",
        pending: "Pending Analysis", 
        completed: "Completed",
        risks: "High Risk Found"
      }
    },
    hi: {
      welcome: "वापस स्वागत है!",
      uploadNew: "नया अनुबंध अपलोड करें",
      recentContracts: "हाल के अनुबंध विश्लेषण",
      quickStats: "त्वरित आंकड़े",
      plan: "वर्तमान योजना: एकल वकील",
      statsLabels: {
        total: "कुल अनुबंध",
        pending: "लंबित विश्लेषण",
        completed: "पूर्ण",
        risks: "उच्च जोखिम मिला"
      }
    }
  };

  const t = content[language];

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    try {
      // Get user profile first
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single();

      if (userProfile) {
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('upload_date', { ascending: false })
          .limit(10);

        setContracts(contractsData || []);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: "Signed out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDownloadReport = async (contractId: string) => {
    try {
      setDownloading(contractId);
      
      // First check if report already exists
      const { data: existingReport, error: reportError } = await supabase
        .from('reports')
        .select('pdf_url')
        .eq('contract_id', contractId)
        .maybeSingle();

      if (reportError) {
        console.error('Error checking for existing report:', reportError);
        throw new Error('Failed to check for existing report: ' + reportError.message);
      }

      let pdfUrl = existingReport?.pdf_url;

      // If no report exists, generate one
      if (!pdfUrl) {
        console.log('No existing report found, generating new report...');
        
        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf-report', {
          body: JSON.stringify({ 
            contractId
          })
        });

        if (pdfError) {
          console.error('Error generating PDF:', pdfError);
          throw new Error('Failed to generate PDF report: ' + pdfError.message);
        }

        if (!pdfData?.success || !pdfData?.pdfUrl) {
          throw new Error('PDF generation failed - no URL returned');
        }

        pdfUrl = pdfData.pdfUrl;
        console.log('PDF generated successfully');
      }

      // Download the PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to download PDF: ' + response.statusText);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-analysis-${contractId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report downloaded successfully",
        description: "Your contract analysis report has been downloaded.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to download report",
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleViewReport = async (contractId: string) => {
    try {
      // Check if report already exists
      const { data: existingReport, error: reportError } = await supabase
        .from('reports')
        .select('pdf_url')
        .eq('contract_id', contractId)
        .maybeSingle();

      if (reportError) {
        console.error('Error checking for existing report:', reportError);
        throw new Error('Failed to check for existing report');
      }

      let pdfUrl = existingReport?.pdf_url;

      // If no report exists, generate one
      if (!pdfUrl) {
        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf-report', {
          body: JSON.stringify({ 
            contractId
          })
        });

        if (pdfError || !pdfData?.success) {
          throw new Error('Failed to generate PDF report');
        }

        pdfUrl = pdfData.pdfUrl;
      }

      // Open PDF in new tab
      window.open(pdfUrl, '_blank');
    } catch (error: any) {
      console.error('View error:', error);
      toast({
        title: "View failed",
        description: error.message || "Failed to view report",
        variant: "destructive"
      });
    }
  };

  // Calculate stats
  const stats = [
    { 
      label: t.statsLabels.total, 
      value: contracts.length.toString(), 
      icon: FileText, 
      color: "text-blue-600" 
    },
    { 
      label: t.statsLabels.pending, 
      value: contracts.filter(c => c.analysis_status === 'pending' || c.analysis_status === 'analyzing').length.toString(), 
      icon: Clock, 
      color: "text-yellow-600" 
    },
    { 
      label: t.statsLabels.completed, 
      value: contracts.filter(c => c.analysis_status === 'completed').length.toString(), 
      icon: CheckCircle, 
      color: "text-green-600" 
    },
    { 
      label: t.statsLabels.risks, 
      value: contracts.filter(c => c.risk_score === 'high').length.toString(), 
      icon: AlertTriangle, 
      color: "text-red-600" 
    }
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: <Badge className="bg-green-100 text-green-700">Completed</Badge>,
      pending: <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>,
      analyzing: <Badge className="bg-blue-100 text-blue-700">Analyzing</Badge>,
      failed: <Badge className="bg-red-100 text-red-700">Failed</Badge>
    };
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>;
  };

  const getRiskBadge = (risk: string | null) => {
    if (!risk) return null;
    const badges = {
      low: <Badge className="bg-green-100 text-green-700">Low Risk</Badge>,
      medium: <Badge className="bg-yellow-100 text-yellow-700">Medium Risk</Badge>,
      high: <Badge className="bg-red-100 text-red-700">High Risk</Badge>
    };
    return badges[risk as keyof typeof badges];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.welcome}</h1>
          <p className="text-gray-600">{t.plan}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-white/60 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card className="bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <span>{t.uploadNew}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/upload')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  {t.uploadNew}
                </Button>
                <p className="text-sm text-gray-600 mt-3 text-center">
                  Supports PDF & DOCX files
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Contracts */}
          <div className="lg:col-span-2">
            <Card className="bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>{t.recentContracts}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contracts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No contracts uploaded yet. Upload your first contract to get started!
                    </div>
                  ) : (
                    contracts.map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg border">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{contract.filename}</h4>
                          <p className="text-sm text-gray-600">
                            Uploaded: {new Date(contract.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(contract.analysis_status)}
                          {getRiskBadge(contract.risk_score)}
                          {contract.analysis_status === 'completed' && (
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewReport(contract.id)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadReport(contract.id)}
                                disabled={downloading === contract.id}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                {downloading === contract.id ? "Downloading..." : "Download"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
