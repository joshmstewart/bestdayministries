-- Create guardian_resources table
CREATE TABLE public.guardian_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  resource_type TEXT NOT NULL DEFAULT 'link',
  url TEXT,
  icon TEXT DEFAULT 'FileText',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.guardian_resources ENABLE ROW LEVEL SECURITY;

-- Public can view active resources
CREATE POLICY "Anyone can view active resources"
ON public.guardian_resources
FOR SELECT
USING (is_active = true);

-- Admins can manage all resources
CREATE POLICY "Admins can manage resources"
ON public.guardian_resources
FOR ALL
USING (public.has_admin_access(auth.uid()));

-- Add timestamp trigger
CREATE TRIGGER update_guardian_resources_updated_at
BEFORE UPDATE ON public.guardian_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.guardian_resources (title, description, category, resource_type, url, icon, display_order) VALUES
('Social Security Disability Insurance (SSDI)', 'Federal program providing monthly benefits to people with disabilities who have worked and paid Social Security taxes.', 'Government Benefits', 'form', 'https://www.ssa.gov/disability/', 'Shield', 1),
('Supplemental Security Income (SSI)', 'Monthly payments to adults and children with disabilities who have limited income and resources.', 'Government Benefits', 'form', 'https://www.ssa.gov/ssi/', 'DollarSign', 2),
('Medicaid Waiver Programs', 'State programs that provide home and community-based services to individuals with disabilities.', 'Healthcare', 'guide', 'https://www.medicaid.gov/medicaid/home-community-based-services/index.html', 'Heart', 3),
('ABLE Accounts', 'Tax-advantaged savings accounts for individuals with disabilities without affecting eligibility for SSI, Medicaid, and other benefits.', 'Financial Planning', 'link', 'https://www.ablenrc.org/', 'PiggyBank', 4),
('Special Needs Trust Guide', 'Information about setting up trusts to protect assets while maintaining benefit eligibility.', 'Financial Planning', 'guide', 'https://www.specialneedsalliance.org/', 'FileText', 5),
('Housing Choice Voucher Program (Section 8)', 'Rental assistance program for low-income families, the elderly, and persons with disabilities.', 'Housing', 'form', 'https://www.hud.gov/topics/housing_choice_voucher_program_section_8', 'Home', 6),
('Vocational Rehabilitation Services', 'State agency services helping individuals with disabilities prepare for, obtain, and maintain employment.', 'Employment', 'link', 'https://rsa.ed.gov/', 'Briefcase', 7),
('Ticket to Work Program', 'Free employment support for Social Security disability beneficiaries ages 18-64.', 'Employment', 'guide', 'https://choosework.ssa.gov/', 'Ticket', 8),
('Respite Care Resources', 'Temporary relief for primary caregivers through short-term care services.', 'Caregiver Support', 'link', 'https://archrespite.org/', 'Users', 9),
('Family Caregiver Alliance', 'Education, services, research, and advocacy for family caregivers.', 'Caregiver Support', 'guide', 'https://www.caregiver.org/', 'HeartHandshake', 10),
('IDEA - Special Education Rights', 'Information about Individuals with Disabilities Education Act and special education services.', 'Education', 'guide', 'https://sites.ed.gov/idea/', 'GraduationCap', 11),
('Assistive Technology Resources', 'Tools and devices that help individuals with disabilities perform tasks more easily.', 'Technology', 'link', 'https://www.atia.org/', 'Laptop', 12);