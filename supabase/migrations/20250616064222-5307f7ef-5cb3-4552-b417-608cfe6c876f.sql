
-- Create users table for authentication and user management
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student', 'lawyer', 'firm')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'solo', 'firm')),
  language_pref TEXT NOT NULL DEFAULT 'en' CHECK (language_pref IN ('en', 'hi')),
  organization TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contracts table to store uploaded contracts
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  content_text TEXT,
  file_size INTEGER,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  contract_type TEXT,
  risk_score TEXT CHECK (risk_score IN ('low', 'medium', 'high')),
  jurisdiction TEXT,
  arbitration_present BOOLEAN DEFAULT false
);

-- Create clauses table to store analyzed contract clauses
CREATE TABLE public.clauses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  clause_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  clause_text TEXT NOT NULL,
  summary_en TEXT,
  summary_hi TEXT,
  risk_score TEXT NOT NULL CHECK (risk_score IN ('safe', 'caution', 'risky')),
  suggestion TEXT,
  flag_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table for generated PDF reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  pdf_url TEXT,
  generated_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chatbot queries table for LawPal Buddy
CREATE TABLE public.chat_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_queries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Create RLS policies for contracts table
CREATE POLICY "Users can view their own contracts" ON public.contracts
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert their own contracts" ON public.contracts
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own contracts" ON public.contracts
  FOR UPDATE USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Create RLS policies for clauses table
CREATE POLICY "Users can view clauses of their contracts" ON public.clauses
  FOR SELECT USING (contract_id IN (
    SELECT c.id FROM public.contracts c 
    JOIN public.users u ON c.user_id = u.id 
    WHERE u.auth_id = auth.uid()
  ));

CREATE POLICY "System can insert clauses" ON public.clauses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update clauses" ON public.clauses
  FOR UPDATE USING (true);

-- Create RLS policies for reports table
CREATE POLICY "Users can view their contract reports" ON public.reports
  FOR SELECT USING (contract_id IN (
    SELECT c.id FROM public.contracts c 
    JOIN public.users u ON c.user_id = u.id 
    WHERE u.auth_id = auth.uid()
  ));

CREATE POLICY "System can insert reports" ON public.reports
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for chat queries table
CREATE POLICY "Users can view their own chat queries" ON public.chat_queries
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert their own chat queries" ON public.chat_queries
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, name, email, role, plan)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'lawyer'),
    'free'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run the function
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
