VISIBILITY_TOGGLE_STANDARD
PURPOSE:btn-component→toggle-DB-UI-state[active/visible|inactive/hidden]
VISUAL:ACTIVE[bg-green-100+hover:bg-green-200+border-green-300+Eye-icon-text-green-700]|INACTIVE[bg-red-100+hover:bg-red-200+border-red-300+EyeOff-icon-text-red-700]
PATTERN:Button[variant=outline+size=icon+onClick=toggleFunction(id,state)+title=state?Deactivate:Activate+className=state?green-classes:red-classes]+icon=state?Eye[w-4-h-4-text-green-700]:EyeOff[w-4-h-4-text-red-700]
FILES:vendor/ProductList.tsx[product-vis]|admin/CommunityOrderManager.tsx[section-vis]|admin/FamilyOrganizationsManager.tsx[org-active]|admin/FeaturedItemManager.tsx[featured-active]|admin/FooterLinksManager.tsx[footer-sections-links]|admin/HomepageOrderManager.tsx[homepage-sections]|admin/NavigationBarManager.tsx[nav-links]|EventManagement.tsx[event-vis]
STANDARD:green=active/visible|red=inactive/hidden[consistent-across-all]
