defmodule TableOfContents.Migrations.V1CreateTocPosts do
  use Ecto.Migration

  def change do
    create_if_not_exists table(:toc_posts, primary_key: false) do
      add :post_id, references(:posts, on_delete: :delete_all), null: false, primary_key: true
      add :enabled_by_id, references(:users, on_delete: :nilify_all)
      timestamps(type: :utc_datetime)
    end
  end
end
