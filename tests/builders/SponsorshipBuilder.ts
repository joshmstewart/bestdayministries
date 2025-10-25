import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class SponsorshipBuilder {
  private sponsorEmail: string;
  private bestieEmail: string;
  private amount: number = 25;
  private frequency: 'one-time' | 'monthly' = 'monthly';
  private status: 'active' | 'cancelled' | 'paused' = 'active';
  private stripeMode: 'test' | 'live' = 'test';

  constructor() {
    const timestamp = Date.now();
    this.sponsorEmail = `testsponsor_${timestamp}@example.com`;
    this.bestieEmail = `testbestie_${timestamp}@example.com`;
  }

  withAmount(amount: number): this {
    this.amount = amount;
    return this;
  }

  withFrequency(frequency: 'one-time' | 'monthly'): this {
    this.frequency = frequency;
    return this;
  }

  withStatus(status: 'active' | 'cancelled' | 'paused'): this {
    this.status = status;
    return this;
  }

  withStripeMode(mode: 'test' | 'live'): this {
    this.stripeMode = mode;
    return this;
  }

  async build() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create sponsor user
    const { data: sponsorAuth, error: sponsorError } = await supabase.auth.admin.createUser({
      email: this.sponsorEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        display_name: 'Test Sponsor',
        role: 'supporter'
      }
    });

    if (sponsorError || !sponsorAuth.user) {
      throw new Error(`Failed to create sponsor: ${sponsorError?.message}`);
    }

    // Create bestie user
    const { data: bestieAuth, error: bestieError } = await supabase.auth.admin.createUser({
      email: this.bestieEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        display_name: 'Test Bestie',
        role: 'bestie'
      }
    });

    if (bestieError || !bestieAuth.user) {
      throw new Error(`Failed to create bestie: ${bestieError?.message}`);
    }

    // Create sponsor_bestie record
    const { data: sponsorBestie, error: sponsorBestieError } = await supabase
      .from('sponsor_besties')
      .insert({
        bestie_id: bestieAuth.user.id,
        bestie_name: 'Test Bestie',
        is_active: true,
        is_public: true,
        monthly_goal: 100,
        approval_status: 'approved',
        image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7',
        aspect_ratio: '1:1',
        created_by: sponsorAuth.user.id
      })
      .select()
      .single();

    if (sponsorBestieError || !sponsorBestie) {
      throw new Error(`Failed to create sponsor bestie: ${sponsorBestieError?.message}`);
    }

    // Create sponsorship
    const { data: sponsorship, error: sponsorshipError } = await supabase
      .from('sponsorships')
      .insert({
        sponsor_id: sponsorAuth.user.id,
        bestie_id: bestieAuth.user.id,
        sponsor_bestie_id: sponsorBestie.id,
        amount: this.amount,
        frequency: this.frequency,
        status: this.status,
        stripe_mode: this.stripeMode,
        started_at: new Date().toISOString(),
        stripe_customer_id: `test_cus_${Date.now()}`,
        stripe_subscription_id: this.frequency === 'monthly' ? `test_sub_${Date.now()}` : null
      })
      .select()
      .single();

    if (sponsorshipError || !sponsorship) {
      throw new Error(`Failed to create sponsorship: ${sponsorshipError?.message}`);
    }

    return {
      sponsor: {
        id: sponsorAuth.user.id,
        email: this.sponsorEmail
      },
      bestie: {
        id: bestieAuth.user.id,
        email: this.bestieEmail
      },
      sponsorBestie,
      sponsorship
    };
  }
}
