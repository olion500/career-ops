.PHONY: help dashboard build run scan pipeline merge dedup verify check clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dashboard: build run ## Build and launch the dashboard

build: ## Build the dashboard binary
	cd dashboard && go build -o career-dashboard .

run: ## Launch the dashboard (assumes already built)
	./dashboard/career-dashboard --path .

scan: ## Scan job boards for new offers
	node scan-boards.mjs

pipeline: ## Show pending URLs in the pipeline inbox
	@grep -c '^- \[ \]' data/pipeline.md | xargs -I{} echo "Pendientes: {}"
	@grep -c '^- \[x\]' data/pipeline.md | xargs -I{} echo "Procesadas: {}"

merge: ## Merge tracker additions from batch/tracker-additions/
	node merge-tracker.mjs

dedup: ## Deduplicate the application tracker
	node dedup-tracker.mjs

verify: ## Verify pipeline integrity
	node verify-pipeline.mjs

check: ## Run cv-sync check
	node cv-sync-check.mjs

clean: ## Remove built dashboard binary
	rm -f dashboard/career-dashboard
