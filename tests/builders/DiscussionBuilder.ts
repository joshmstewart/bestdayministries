import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class DiscussionBuilder {
  private authorEmail: string;
  private title: string = 'Test Discussion Post';
  private content: string = 'This is test content for a discussion post.';
  private approvalStatus: 'approved' | 'pending_approval' | 'rejected' = 'approved';
  private isModerated: boolean = true;
  private commentsCount: number = 0;

  constructor() {
    const timestamp = Date.now();
    this.authorEmail = `testauthor_${timestamp}@example.com`;
  }

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  withContent(content: string): this {
    this.content = content;
    return this;
  }

  withApprovalStatus(status: 'approved' | 'pending_approval' | 'rejected'): this {
    this.approvalStatus = status;
    return this;
  }

  withModeration(isModerated: boolean): this {
    this.isModerated = isModerated;
    return this;
  }

  withComments(count: number): this {
    this.commentsCount = count;
    return this;
  }

  async build() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create author user
    const { data: authorAuth, error: authorError } = await supabase.auth.admin.createUser({
      email: this.authorEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        display_name: 'Test Author',
        role: 'caregiver'
      }
    });

    if (authorError || !authorAuth.user) {
      throw new Error(`Failed to create author: ${authorError?.message}`);
    }

    // Create discussion post
    const { data: post, error: postError } = await supabase
      .from('discussion_posts')
      .insert({
        author_id: authorAuth.user.id,
        title: this.title,
        content: this.content,
        approval_status: this.approvalStatus,
        is_moderated: this.isModerated
      })
      .select()
      .single();

    if (postError || !post) {
      throw new Error(`Failed to create discussion post: ${postError?.message}`);
    }

    const comments = [];

    // Create comments if requested
    for (let i = 0; i < this.commentsCount; i++) {
      const { data: comment, error: commentError } = await supabase
        .from('discussion_comments')
        .insert({
          post_id: post.id,
          author_id: authorAuth.user.id,
          content: `Test comment ${i + 1}`,
          approval_status: 'approved'
        })
        .select()
        .single();

      if (commentError || !comment) {
        console.warn(`Failed to create comment ${i + 1}: ${commentError?.message}`);
      } else {
        comments.push(comment);
      }
    }

    return {
      author: {
        id: authorAuth.user.id,
        email: this.authorEmail
      },
      post,
      comments
    };
  }
}
