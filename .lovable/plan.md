

## Plan: Clarify Weight/Dimensions as Optional

Update the shipping section in `src/pages/VendorInfo.tsx` to make it clear that weight and dimensions are optional — if not provided, flat rate shipping is used as the default.

### Changes to `src/pages/VendorInfo.tsx`

**Line 130** — Update the bullet about weight/dimensions to clarify it's optional:
- From: `For dynamic rates, enter weight and dimensions for each product`
- To: `Optionally enter weight and dimensions for each product to enable dynamic carrier rates — if not provided, flat rate shipping will be used`

This is a single-line text change.

