defmodule TableOfContents.ApiRouter do
  use Plug.Router

  import Plug.Conn
  import Ecto.Query

  alias Nexus.Repo
  alias Nexus.Extensions.Permissions

  plug :match
  plug :dispatch

  # GET /status/:post_id
  # Returns whether ToC is enabled for the given post.
  # Public — no auth required to read status (the widget reads this).
  get "/status/:post_id" do
    post_id = parse_post_id(post_id)

    if is_nil(post_id) do
      conn
      |> put_resp_content_type("application/json")
      |> send_resp(400, ~s({"error":"invalid post_id"}))
    else
      enabled =
        Repo.exists?(
          from t in "toc_posts", where: t.post_id == ^post_id
        )

      conn
      |> put_resp_content_type("application/json")
      |> send_resp(200, Jason.encode!(%{enabled: enabled}))
    end
  end

  # POST /toggle
  # Body: {"post_id": 123}
  # Requires can_enable_toc permission. Toggles ToC on/off for the post.
  post "/toggle" do
    user = conn.assigns[:current_user]

    case Permissions.check("nexus-toc", "can_enable_toc", user) do
      :error ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(403, ~s({"error":"Access denied"}))

      :ok ->
        post_id = parse_post_id(conn.body_params["post_id"])

        if is_nil(post_id) do
          conn
          |> put_resp_content_type("application/json")
          |> send_resp(400, ~s({"error":"post_id is required"}))
        else
          existing =
            Repo.one(
              from t in "toc_posts",
                where: t.post_id == ^post_id,
                select: t.post_id
            )

          now = DateTime.utc_now() |> DateTime.truncate(:second)

          result =
            if existing do
              # Already enabled — disable it
              Repo.delete_all(from t in "toc_posts", where: t.post_id == ^post_id)
              {:ok, false}
            else
              # Not enabled — enable it
              Repo.insert_all("toc_posts", [
                %{
                  post_id: post_id,
                  enabled_by_id: user && user.id,
                  inserted_at: now,
                  updated_at: now
                }
              ])
              {:ok, true}
            end

          case result do
            {:ok, enabled} ->
              conn
              |> put_resp_content_type("application/json")
              |> send_resp(200, Jason.encode!(%{ok: true, enabled: enabled}))

            _ ->
              conn
              |> put_resp_content_type("application/json")
              |> send_resp(500, ~s({"error":"Failed to update"}))
          end
        end
    end
  end

  match _ do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(404, ~s({"error":"not found"}))
  end

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

  defp parse_post_id(value) when is_integer(value) and value > 0, do: value
  defp parse_post_id(value) when is_binary(value) do
    case Integer.parse(value) do
      {id, ""} when id > 0 -> id
      _ -> nil
    end
  end
  defp parse_post_id(_), do: nil
end
