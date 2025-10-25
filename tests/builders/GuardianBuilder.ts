import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class GuardianBuilder {
  private guardianEmail: string;
  private bestieEmail?: string;
  private approvalFlags: {
    posts?: boolean;
    comments?: boolean;
    messages?: boolean;
    vendorAssets?: boolean;
  } = {};
  private withBestie = false;

  constructor() {
    const timestamp = Date.now();
    this.guardianEmail = `testguardian_${timestamp}@example.com`;
  }

  withLinkedBestie(bestieEmail?: string): this {
    this.withBestie = true;
    this.bestieEmail = bestieEmail || `testbestie_${Date.now()}@example.com`;
    return this;
  }

  withApprovalFlags(flags: {
    posts?: boolean;
    comments?: boolean;
    messages?: boolean;
    vendorAssets?: boolean;
  }): this {
    this.approvalFlags = flags;
    return this;
  }

  async build() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create guardian user
    const { data: guardianAuth, error: guardianAuthError } = await supabase.auth.admin.createUser({
      email: this.guardianEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        display_name: 'Test Guardian',
        role: 'caregiver'
      }
    });

    if (guardianAuthError || !guardianAuth.user) {
      throw new Error(`Failed to create guardian: ${guardianAuthError?.message}`);
    }

    const result: any = {
      guardian: {
        id: guardianAuth.user.id,
        email: this.guardianEmail
      }
    };

    // Create bestie if requested
    if (this.withBestie && this.bestieEmail) {
      const { data: bestieAuth, error: bestieAuthError } = await supabase.auth.admin.createUser({
        email: this.bestieEmail,
        password: 'testpassword123',
        email_confirm: true,
        user_metadata: {
          display_name: 'Test Bestie',
          role: 'bestie'
        }
      });

      if (bestieAuthError || !bestieAuth.user) {
        throw new Error(`Failed to create bestie: ${bestieAuthError?.message}`);
      }

      result.bestie = {
        id: bestieAuth.user.id,
        email: this.bestieEmail
      };

      // Create caregiver-bestie link
      const { error: linkError } = await supabase
        .from('caregiver_bestie_links')
        .insert({
          caregiver_id: guardianAuth.user.id,
          bestie_id: bestieAuth.user.id,
          require_post_approval: this.approvalFlags.posts ?? false,
          require_comment_approval: this.approvalFlags.comments ?? false,
          require_message_approval: this.approvalFlags.messages ?? false,
          require_vendor_asset_approval: this.approvalFlags.vendorAssets ?? false
        });

      if (linkError) {
        throw new Error(`Failed to create guardian-bestie link: ${linkError.message}`);
      }
    }

    return result;
  }
}
