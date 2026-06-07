# Table of Contents

Adds an opt-in Table of Contents widget to the right sidebar on Nexus post pages.

When enabled on a post, the widget parses H1 and H2 headings from the post body
and renders a nested navigation list. Clicking an entry smoothly scrolls the post
content area to that heading. The active heading is highlighted as the reader scrolls.

## Installation

Install via Admin → Extensions → Install from URL, or from the command line:

```bash
mix nexus.extension.install ./table-of-contents
```

## Usage

1. Open any post with H1 or H2 headings.
2. Click the **…** overflow menu on the post.
3. Click **Table of Contents** to enable it.
4. The widget appears in the right sidebar for all visitors to that post.
5. Click **Table of Contents** again in the … menu to remove it.

## Permissions

By default, only **admins** can enable or disable the Table of Contents on posts.
This can be changed in **Admin → Permissions → Table of Contents** to allow
moderators or members to use it.

## Settings

No settings are currently exposed. The widget appears automatically when ToC is enabled on a post and the post contains at least one H1 or H2 heading.

## Heading structure

- **H1** (`# Heading`) — top-level entries, shown at full weight
- **H2** (`## Heading`) — nested entries, indented with a left border accent

H3 and deeper headings are ignored.
