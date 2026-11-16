#!/usr/bin/env bash
# main has a texts table indexed on (project_id, id). The export-recent-texts
# branch pages through a project's texts filtered by created_at, which no
# index serves, against a replica with a 600 s read timeout.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p app/models app/tasks config db
cat > CLAUDE.md <<'X'
# Catalog

A Rails app. Tests run with `bin/rails test`, which needs MySQL; it is not
available here.
X
cat > db/schema.rb <<'X'
ActiveRecord::Schema[7.1].define(version: 2026_09_01_000000) do
  create_table "texts", charset: "utf8mb4" do |t|
    t.bigint "project_id", null: false
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "id"], name: "index_texts_on_project_id_and_id"
    t.index ["project_id"], name: "index_texts_on_project_id"
  end
end
X
cat > config/database.yml <<'X'
production:
  primary:
    adapter: mysql2
    database: catalog
  primary_replica:
    adapter: mysql2
    database: catalog
    replica: true
    read_timeout: 600
X
cat > app/models/text.rb <<'X'
class Text < ApplicationRecord
  belongs_to :project
end
X
git add -A && git commit -q -m "feat: texts"
git remote add origin https://example.invalid/catalog.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b export-recent-texts
cat > app/tasks/export_recent_texts.rb <<'X'
# Exports the texts a project registered between two times, for support.
class ExportRecentTexts
  BATCH_SIZE = 1_000

  def call(project_id:, from:, to:)
    rows = []
    last_id = 0
    ActiveRecord::Base.connected_to(role: :reading) do
      loop do
        batch = Text.where(project_id: project_id)
                    .where('created_at >= ? AND created_at < ?', from, to)
                    .where('id > ?', last_id)
                    .order(:id)
                    .limit(BATCH_SIZE)
                    .to_a
        break if batch.empty?

        rows.concat(batch.map { |text| [text.id, text.body] })
        last_id = batch.last.id
      end
    end
    rows
  end
end
X
git add -A && git commit -q -m "feat: export recent texts"

# The graders read the file the model writes, named with today's date, through .eval/.
d=$(date +%Y%m%d) && mkdir -p .eval && echo '.eval/' >> .git/info/exclude
ln -s "../.reviews/REV-$d-export-recent-texts.md" .eval/review.md
