
import React, { useState } from 'react';
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
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [language, setLanguage] = useState('en');
  const navigate = useNavigate();

  const content = {
    en: {
      welcome: "Welcome back, Advocate Sharma!",
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
      welcome: "वापस स्वागत है, एडवोकेट शर्मा!",
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

  // Mock data
  const stats = [
    { label: t.statsLabels.total, value: "24", icon: FileText, color: "text-blue-600" },
    { label: t.statsLabels.pending, value: "3", icon: Clock, color: "text-yellow-600" },
    { label: t.statsLabels.completed, value: "21", icon: CheckCircle, color: "text-green-600" },
    { label: t.statsLabels.risks, value: "5", icon: AlertTriangle, color: "text-red-600" }
  ];

  const recentContracts = [
    {
      id: 1,
      name: "Employment Agreement - Tech Corp",
      uploadDate: "2024-06-15",
      status: "completed",
      riskLevel: "medium"
    },
    {
      id: 2,
      name: "Vendor Service Agreement", 
      uploadDate: "2024-06-14",
      status: "pending",
      riskLevel: null
    },
    {
      id: 3,
      name: "Partnership Agreement",
      uploadDate: "2024-06-13", 
      status: "completed",
      riskLevel: "high"
    }
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: <Badge className="bg-green-100 text-green-700">Completed</Badge>,
      pending: <Badge className="bg-yellow-100 text-yellow-700">Analyzing...</Badge>,
      failed: <Badge className="bg-red-100 text-red-700">Failed</Badge>
    };
    return badges[status as keyof typeof badges];
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
            <Button variant="outline" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline">
              <User className="h-4 w-4 mr-2" />
              Profile
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
                  {recentContracts.map((contract) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{contract.name}</h4>
                        <p className="text-sm text-gray-600">Uploaded: {contract.uploadDate}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(contract.status)}
                        {getRiskBadge(contract.riskLevel)}
                        {contract.status === 'completed' && (
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Report
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/60 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <BarChart className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600">View detailed contract insights</p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Risk Assessment</h3>
              <p className="text-sm text-gray-600">Review risk patterns</p>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <User className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">LawPal Buddy</h3>
              <p className="text-sm text-gray-600">Ask questions about contracts</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
