# affirmations

Web application to present affirmations/happy sayings with a fancy (sometimes animated) background. These will be called "pages." It will run on railway, which will point to the repository to publish. 

Users will use RFID tags and scan them with their iPhones, which will take them to the page or a random page.

- RBAC
	- Pubically-viewable pages with simple URLs
	- Pages viewable only with the appropriate GET string
	- Editor access to add, move, change, delete pages
	- Admin/owner with full access
- WYSIWYG editor for the sayings with ability to insert flourishes
- Preview mode
- Ability to use any Google and other widely-available Font
- Ability for admin to upload web fonts
- Ability to admin to enable Adobe web fonts


Pages have categories. Editors can enable direct access to pages using a direct URL or can set up URLs to point to a category, which will deliver a random page in that category, or a super-category that will deliver a random page across the entire site.

Page backgrounds can be set either with a specific background, a random background from the category, or random from the domain.

Backgrounds can be standard web image formats, including animated.