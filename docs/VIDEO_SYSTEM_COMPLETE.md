VIDEO_SYSTEM
COMPS:VideoPlayer(HTML5+auto-hide-controls+dynamic-aspect-from-meta+max-w-md[vert]|max-w-2xl[land]+NO-object-fit[critical:bars/crop])|YouTubeEmbed(iframe+parse-all-YT-URL+def:16:9)|YouTubeChannel(promo-section+custom-YT-logo+config[badge+heading+desc+URL]+card-gradient-bg)
DB:videos(id|title|video_url[uploads]|youtube_url[embeds]|video_type|thumbnail_url|description|category|is_active|display_order)|about_sections.youtube_channel(content.badge_text|heading|description|channel_url|button_text)|storage:videos-bucket[100MB]+RLS[public-SELECT-active+admins-ALL]
ADMIN:VideoManager→Admin-Media-Videos→upload/embed+thumbnails+meta+toggle-vis+reorder[drag-drop]+del|AudioClipsManager→Admin-Media-Audio-Clips→upload+meta+categories+vis+search|YouTube-Channel→Admin-About→Edit-youtube_channel-section→config[URL+button-text+desc]
INTEGRATIONS:discussion_posts(video_id[link-table]|youtube_url[direct])|app_settings.sponsor_page_content.featured_video_id|videos-page[gallery+fullscreen-dialog]|about-page(youtube-channel-section[about_sections]+doc-watch-btns[YT/Vimeo/Dailymotion→about_sections.content.doc_*_url])
RULES:VideoPlayer:YES[dynamic-aspectRatio-inline+w-full-h-full+grad-overlays]NO[object-fit+fixed-aspect]|YouTubeEmbed:YES[flex-URL-parse+AspectRatio-wrap+iframe-security]|YouTubeChannel:YES[red-YT-logo-SVG[rounded-rect+white-triangle]+btn-new-tab]NO[Lucide-YouTube-icon]
ISSUES:black-bars/crop→rm-object-fit|wrong-size→dynamic-style|YT-logo-wrong→custom-SVG-red-bg-white-tri
FILES:VideoPlayer.tsx|YouTubeEmbed.tsx|VideoManager.tsx|YouTubeChannel.tsx|About.tsx[doc-section]
