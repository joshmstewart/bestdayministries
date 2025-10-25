import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class VendorBuilder {
  private vendorEmail: string;
  private businessName: string = 'Test Vendor Business';
  private status: 'pending' | 'approved' | 'rejected' | 'suspended' = 'approved';
  private productsCount: number = 0;

  constructor() {
    const timestamp = Date.now();
    this.vendorEmail = `testvendor_${timestamp}@example.com`;
  }

  withBusinessName(name: string): this {
    this.businessName = name;
    return this;
  }

  withStatus(status: 'pending' | 'approved' | 'rejected' | 'suspended'): this {
    this.status = status;
    return this;
  }

  withProducts(count: number): this {
    this.productsCount = count;
    return this;
  }

  async build() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create vendor user
    const { data: vendorAuth, error: vendorError } = await supabase.auth.admin.createUser({
      email: this.vendorEmail,
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        display_name: 'Test Vendor',
        role: 'supporter'
      }
    });

    if (vendorError || !vendorAuth.user) {
      throw new Error(`Failed to create vendor user: ${vendorError?.message}`);
    }

    // Create vendor record
    const { data: vendor, error: createVendorError } = await supabase
      .from('vendors')
      .insert({
        user_id: vendorAuth.user.id,
        business_name: this.businessName,
        status: this.status,
        contact_email: this.vendorEmail
      })
      .select()
      .single();

    if (createVendorError || !vendor) {
      throw new Error(`Failed to create vendor: ${createVendorError?.message}`);
    }

    const products = [];

    // Create products if requested
    for (let i = 0; i < this.productsCount; i++) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          vendor_id: vendor.id,
          name: `Test Product ${i + 1}`,
          description: `Description for test product ${i + 1}`,
          price: 10 + (i * 5),
          coin_price: 100 + (i * 50),
          stock_quantity: 10,
          is_active: true
        })
        .select()
        .single();

      if (productError || !product) {
        console.warn(`Failed to create product ${i + 1}: ${productError?.message}`);
      } else {
        products.push(product);
      }
    }

    return {
      vendor: {
        id: vendorAuth.user.id,
        email: this.vendorEmail
      },
      vendorRecord: vendor,
      products
    };
  }
}
