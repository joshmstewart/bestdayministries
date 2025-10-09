GUARDIAN_APPROVALS|/guardian-approvals|caregiver-only
TABS:posts(discussion_posts.approval_status=pending_approval+linked_bestie→approve[approved+is_moderated=true]|reject[rejected]|del)|comments(discussion_comments.approval_status=pending_approval+linked→approve|reject)|vendors(VendorLinkRequests:vendor_bestie_requests.status=pending+linked→approve[status=approved]|reject[rejected])|messages(BestieSponsorMessages:sponsor_messages.status=pending_approval+linked→approve-as-is[status=approved]|edit-approve[subject/text/img-crop-recrop/vid-upload+from_guardian=true+save→app-assets/sponsor-messages/]|reject[reason])
FLAGS:caregiver_bestie_links(require_post_approval|require_comment_approval|require_message_approval[def:true]|require_vendor_asset_approval)
BADGE:useGuardianApprovalsCount→SUM(pending:posts+comments+vendor_links+messages)→realtime-subscriptions×4
RLS:is_guardian_of(guardian_id,bestie_id)→UPDATE(discussion_posts|discussion_comments|vendor_bestie_requests|sponsor_messages)
FILES:GuardianApprovals.tsx|VendorLinkRequests.tsx|BestieSponsorMessages.tsx|useGuardianApprovalsCount.ts
ISSUES:empty→check-links|count-no-update→verify-realtime-cleanup|cant-approve→check-is_guardian_of-func
