
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Upload, Shield, BookOpen, Users, BarChart, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const [language, setLanguage] = useState('en');
  const navigate = useNavigate();

  const content = {
    en: {
      tagline: "India's Smartest Legal Contract Reviewer",
      subtitle: "Save time. Reduce risk. Get smart legal suggestions instantly.",
      uploadBtn: "Upload Contract",
      loginBtn: "Login",
      tryFreeBtn: "Try for Free",
      features: [
        "AI-powered contract analysis",
        "Clause-by-clause risk assessment", 
        "Bilingual support (English + Hindi)",
        "Instant legal suggestions",
        "Downloadable reports",
        "Built for Indian law"
      ],
      forWho: "Perfect for",
      roles: ["Solo Lawyers", "Law Students", "Legal Firms", "Startups"],
      pricing: {
        student: { name: "Student", price: "Free", contracts: "5 contracts/month" },
        solo: { name: "Solo Lawyer", price: "₹999/month", contracts: "Unlimited" },
        firm: { name: "Law Firm", price: "₹2999/month", contracts: "5 seats + team dashboard" }
      }
    },
    hi: {
      tagline: "भारत का सबसे स्मार्ट कानूनी अनुबंध समीक्षक",
      subtitle: "समय बचाएं। जोखिम कम करें। तुरंत स्मार्ट कानूनी सुझाव पाएं।",
      uploadBtn: "अनुबंध अपलोड करें",
      loginBtn: "लॉगिन",
      tryFreeBtn: "मुफ्त में कोशिश करें",
      features: [
        "एआई-संचालित अनुबंध विश्लेषण",
        "खंड-दर-खंड जोखिम मूल्यांकन",
        "द्विभाषी समर्थन (अंग्रेजी + हिंदी)",
        "तत्काल कानूनी सुझाव",
        "डाउनलोड योग्य रिपोर्ट",
        "भारतीय कानून के लिए निर्मित"
      ],
      forWho: "के लिए आदर्श",
      roles: ["एकल वकील", "कानून के छात्र", "कानूनी फर्में", "स्टार्टअप"],
      pricing: {
        student: { name: "छात्र", price: "मुफ्त", contracts: "5 अनुबंध/महीना" },
        solo: { name: "एकल वकील", price: "₹999/महीना", contracts: "असीमित" },
        firm: { name: "कानूनी फर्म", price: "₹2999/महीना", contracts: "5 सीटें + टीम डैशबोर्ड" }
      }
    }
  };

  const t = content[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
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
            <Button variant="outline" onClick={() => navigate('/login')}>
              {t.loginBtn}
            </Button>
            <Button onClick={() => navigate('/signup')}>
              {t.tryFreeBtn}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100">
          🚀 Powered by GPT-4o
        </Badge>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          {t.tagline}
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {t.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
            onClick={() => navigate('/upload')}
          >
            <Upload className="h-5 w-5" />
            <span>{t.uploadBtn}</span>
          </Button>
          <Button size="lg" variant="outline">
            {t.tryFreeBtn}
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          {t.features.map((feature, index) => (
            <Card key={index} className="bg-white/60 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <p className="text-gray-700">{feature}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Target Users */}
      <section className="bg-white/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t.forWho}</h2>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {t.roles.map((role, index) => {
              const icons = [Users, BookOpen, Shield, BarChart];
              const Icon = icons[index];
              return (
                <Card key={index} className="p-6 min-w-[200px] hover:shadow-lg transition-shadow">
                  <Icon className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">{role}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          {language === 'en' ? 'Simple Pricing' : 'सरल मूल्य निर्धारण'}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {Object.values(t.pricing).map((plan, index) => (
            <Card key={index} className={`p-6 relative ${index === 1 ? 'border-blue-500 border-2 scale-105' : ''}`}>
              {index === 1 && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                  {language === 'en' ? 'Most Popular' : 'सबसे लोकप्रिय'}
                </Badge>
              )}
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-blue-600 mb-4">{plan.price}</p>
                <p className="text-gray-600 mb-6">{plan.contracts}</p>
                <Button className="w-full" variant={index === 1 ? 'default' : 'outline'}>
                  {language === 'en' ? 'Choose Plan' : 'योजना चुनें'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-6 w-6" />
            <span className="text-xl font-bold">LawPal AI</span>
          </div>
          <p className="text-gray-400">
            {language === 'en' 
              ? '© 2024 LawPal AI. Empowering Indian legal professionals with AI.'
              : '© 2024 LawPal AI. एआई के साथ भारतीय कानूनी पेशेवरों को सशक्त बनाना।'
            }
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
