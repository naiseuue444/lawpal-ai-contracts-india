
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Mail, Lock, User, Globe, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Signup = () => {
  const [language, setLanguage] = useState('en');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    organization: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const content = {
    en: {
      title: "Join LawPal AI",
      subtitle: "Start your smart legal contract analysis journey",
      nameLabel: "Full Name",
      emailLabel: "Email",
      passwordLabel: "Password",
      roleLabel: "Role",
      orgLabel: "Organization (Optional)",
      signupBtn: "Create Account",
      loginLink: "Already have an account? Sign in",
      roles: {
        student: "Law Student",
        lawyer: "Solo Lawyer", 
        firm: "Law Firm"
      }
    },
    hi: {
      title: "LawPal AI में शामिल हों",
      subtitle: "अपने स्मार्ट कानूनी अनुबंध विश्लेषण की यात्रा शुरू करें",
      nameLabel: "पूरा नाम",
      emailLabel: "ईमेल",
      passwordLabel: "पासवर्ड",
      roleLabel: "भूमिका",
      orgLabel: "संगठन (वैकल्पिक)",
      signupBtn: "खाता बनाएं",
      loginLink: "पहले से खाता है? साइन इन करें",
      roles: {
        student: "कानून के छात्र",
        lawyer: "एकल वकील",
        firm: "कानूनी फर्म"
      }
    }
  };

  const t = content[language];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate signup for now
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Account Created!",
        description: "Welcome to LawPal AI! Your account has been created successfully.",
      });
      navigate('/dashboard');
    }, 1000);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">LawPal AI</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center space-x-1"
          >
            <Globe className="h-4 w-4" />
            <span>{language === 'en' ? 'हिं' : 'EN'}</span>
          </Button>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{t.title}</CardTitle>
            <p className="text-gray-600 text-center">{t.subtitle}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.nameLabel}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Advocate Name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t.emailLabel}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="lawyer@example.com"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t.passwordLabel}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">{t.roleLabel}</Label>
                <Select onValueChange={(value) => updateFormData('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>{t.roles.student}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="lawyer">{t.roles.lawyer}</SelectItem>
                    <SelectItem value="firm">{t.roles.firm}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">{t.orgLabel}</Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="Law School / Firm Name"
                  value={formData.organization}
                  onChange={(e) => updateFormData('organization', e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Account..." : t.signupBtn}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button 
                variant="link" 
                onClick={() => navigate('/login')}
                className="text-sm"
              >
                {t.loginLink}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
