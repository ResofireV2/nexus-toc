defmodule TableOfContents do
  @moduledoc """
  Table of Contents extension for Nexus.

  Adds an opt-in Table of Contents widget to the right sidebar on post pages.
  Admins (or users with the can_enable_toc permission) can enable the ToC
  on any post via the post's … overflow menu. The widget parses H1 and H2
  headings from the post body and renders a nested navigation list.

  ## Tables

  - `toc_posts` — stores which posts have ToC enabled. One row per post.
    Deleted automatically when the post is deleted (on_delete: :delete_all).
  """

  use Nexus.Extensions.Behaviour

  import Ecto.Query
  alias Nexus.Repo

  @impl true
  def migrations do
    [
      TableOfContents.Migrations.V1CreateTocPosts
    ]
  end

  @impl true
  def routes do
    [{"/", TableOfContents.ApiRouter, []}]
  end

  # Clean up toc_posts rows when a post is deleted.
  # The FK has on_delete: :delete_all so this is belt-and-suspenders,
  # but being explicit is good practice.
  @impl true
  def handle_event("post_deleted", %{"post_id" => post_id}, _settings) do
    Repo.delete_all(from t in "toc_posts", where: t.post_id == ^post_id)
    :ok
  end

  def handle_event(_event, _payload, _settings), do: :ok
end
