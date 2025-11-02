# 開発支援スクリプト v3.0

set -euo pipefail

# グローバル変数
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly TEMP_DIR="${TMPDIR:-/tmp}/dev-sh-$$"

# テストパスマッピング設定（パターンマッチング用）
readonly PATH_MAPPING_PATTERNS="src/lib/:test/lib/"

# フラグ変数
VERBOSE_MODE=false
ORIGINAL_ARGS=()

# エラーハンドラー
error_handler() {
    local exit_code=$?
    local line_number=$1
    echo "" >&2
    echo "[FATAL] スクリプトエラー発生 (行: $line_number, 終了コード: $exit_code)" >&2
    echo "[INFO] 実行ディレクトリ: $(pwd)" >&2
    cleanup_resources
    exit $exit_code
}

# リソースクリーンアップ
cleanup_resources() {
    [[ -d "$TEMP_DIR" ]] && rm -rf "$TEMP_DIR" 2>/dev/null || true
}

# トラップ設定
trap 'error_handler $LINENO' ERR
trap cleanup_resources EXIT

# =============================================================================
# コマンド実行エンジン
# =============================================================================

# 基本コマンツ実行（ログ付き）
execute_command() {
    local command="$1"
    local mode="${2:-default}"
    
    echo "[EXEC] $command"
    
    case "$mode" in
        "verbose")
            # test/setup.tsと連携: VITEST_CONSOLE_LOGを有効化
            VITEST_CONSOLE_LOG=true eval "$command"
            ;;
        "silent")
            execute_silent "$command"
            ;;
        *)
            eval "$command"
            ;;
    esac
}

# サイレント実行（エラー時のみ表示）
execute_silent() {
    local command="$1"
    local output_file="$TEMP_DIR/cmd_output"
    
    mkdir -p "$TEMP_DIR"
    
    if eval "$command" > "$output_file" 2>&1; then
        # vitestの場合はサマリー情報のみ表示（個別テスト結果を非表示）
        if [[ "$command" == *"vitest"* ]]; then
            grep -E "^ Test Files|^      Tests|^   Start at|^   Duration" "$output_file" || echo "[SUCCESS] テスト完了"
        else
            echo "[SUCCESS] コマンド完了"
        fi
        return 0
    else
        local exit_code=$?
        echo "[ERROR] コマンド実行失敗: $command" >&2
        cat "$output_file" >&2
        return $exit_code
    fi
}

# Vitest専用実行（test/setup.ts連携）
execute_vitest() {
    local vitest_args="$1"
    local mode="$2"
    
    local vitest_command="npx vitest run --coverage=false $vitest_args"
    
    if [[ "$mode" == "verbose" ]]; then
        # test/setup.tsでVITEST_CONSOLE_LOG=trueが設定されている場合の動作を再現
        VITEST_CONSOLE_LOG=true execute_command "$vitest_command" "verbose"
    else
        execute_command "$vitest_command" "silent"
    fi
}

# =============================================================================
# テストファイル推論エンジン
# =============================================================================

# パターンからテストファイルを検索
find_test_files_by_pattern() {
    local pattern="$1"
    local test_files=()
    
    # ファイル名ベースの検索（部分一致）
    if [[ -d "test" ]]; then
        local temp_file="$TEMP_DIR/find_results_$$"
        mkdir -p "$TEMP_DIR"
        find test -name "*${pattern}*.test.ts" -type f -print0 2>/dev/null | sort -z > "$temp_file"
        while IFS= read -r -d '' file; do
            test_files+=("$file")
        done < "$temp_file"
    fi
    
    # 結果を出力
    if [[ ${#test_files[@]} -gt 0 ]]; then
        printf '%s\n' "${test_files[@]}"
    fi
}

# ソースファイルからテストファイルを推論
resolve_test_file() {
    local src_file="$1"
    local test_file=""
    
    # テストファイル直接指定の場合
    if [[ "$src_file" == test/*.test.ts && -f "$src_file" ]]; then
        echo "$src_file"
        return 0
    fi
    
    # パスマッピングパターンを順次チェック
    local mapping
    for mapping in $PATH_MAPPING_PATTERNS; do
        local src_pattern="${mapping%:*}"
        local test_pattern="${mapping#*:}"
        
        if [[ "$src_file" == ${src_pattern}* ]]; then
            local relative_path="${src_file#$src_pattern}"
            # サブディレクトリ構造を保持してテストファイル名を生成
            local relative_dir="$(dirname "$relative_path")"
            local base_name="$(basename "$relative_path" .ts)"
            
            if [[ "$relative_dir" == "." ]]; then
                # ルートレベルのファイル
                test_file="${test_pattern}${base_name}.test.ts"
            else
                # サブディレクトリ内のファイル
                test_file="${test_pattern}${relative_dir}/${base_name}.test.ts"
            fi
            break
        fi
    done
    
    # ファイル存在確認
    if [[ -n "$test_file" && -f "$test_file" ]]; then
        echo "$test_file"
        return 0
    fi
    
    # フォールバック検索（ディレクトリ構造を考慮）
    local base_name="$(basename "$src_file" .ts)"
    
    # 基本パターンファイル
    local potential_files=(
        "test/services/${base_name}.test.ts"
        "test/utils/${base_name}.test.ts"
    )
    
    # サブディレクトリも含めた検索
    if [[ -d "test/services" ]]; then
        local temp_file="$TEMP_DIR/services_$$"
        mkdir -p "$TEMP_DIR"
        find test/services -name "${base_name}.test.ts" -type f -print0 2>/dev/null > "$temp_file"
        while IFS= read -r -d '' file; do
            potential_files+=("$file")
        done < "$temp_file"
    fi

    if [[ -d "test/utils" ]]; then
        local temp_file="$TEMP_DIR/utils_$$"
        mkdir -p "$TEMP_DIR"
        find test/utils -name "${base_name}.test.ts" -type f -print0 2>/dev/null > "$temp_file"
        while IFS= read -r -d '' file; do
            potential_files+=("$file")
        done < "$temp_file"
    fi
    
    for file in "${potential_files[@]}"; do
        if [[ -f "$file" ]]; then
            echo "$file"
            return 0
        fi
    done
    
    # パターンマッチング用（最終フォールバック）
    echo "pattern:$base_name"
    return 1
}

# =============================================================================
# 引数解析と設定
# =============================================================================

# 引数解析
parse_arguments() {
    VERBOSE_MODE=false
    ORIGINAL_ARGS=()
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE_MODE=true
                shift
                ;;
            *)
                ORIGINAL_ARGS+=("$1")
                shift
                ;;
        esac
    done
}

# 実行モードを決定
get_execution_mode() {
    if [[ "$VERBOSE_MODE" == "true" ]]; then
        echo "verbose"
    else
        echo "silent"
    fi
}

# =============================================================================
# メインコマンド関数
# =============================================================================

# 特定のテストファイルを実行
cmd_file() {
    local file_path="$1"
    local mode="$(get_execution_mode)"
    
    [[ -f "$file_path" ]] || { echo "[ERROR] テストファイルが見つかりません: $file_path" >&2; return 1; }
    
    echo "[FILE] 特定のテストファイルを実行: $file_path"

    execute_command "npm run check" "$mode" && \
    execute_vitest "'$file_path'" "$mode"
}

# パターンマッチでテストを実行
cmd_pattern() {
    local pattern="$1"
    local mode="$(get_execution_mode)"
    
    [[ -n "$pattern" ]] || { echo "[ERROR] テストパターンを指定してください" >&2; return 1; }
    
    # 1. ファイル名ベースの検索を試行
    local matching_files=()
    local temp_file="$TEMP_DIR/pattern_$$"
    mkdir -p "$TEMP_DIR"
    find_test_files_by_pattern "$pattern" > "$temp_file"
    while IFS= read -r file; do
        [[ -n "$file" ]] && matching_files+=("$file")
    done < "$temp_file"
    
    if [[ ${#matching_files[@]} -gt 0 ]]; then
        # ファイルベースのマッチが見つかった場合
        if [[ ${#matching_files[@]} -eq 1 ]]; then
            echo "[PATTERN-FILE] ファイル名マッチ検出: $pattern → ${matching_files[0]}"
            execute_command "npm run check" "$mode" && \
            execute_vitest "'${matching_files[0]}'" "$mode"
        else
            echo "[PATTERN-MULTI] 複数ファイルマッチ検出: $pattern (${#matching_files[@]}件)"
            [[ "$mode" == "verbose" ]] && {
                printf '  - %s\n' "${matching_files[@]}"
            }
            # 複数ファイルを空白区切りで渡す
            local file_args=""
            for file in "${matching_files[@]}"; do
                file_args+="'$file' "
            done
            execute_command "npm run check" "$mode" && \
            execute_vitest "$file_args" "$mode"
        fi
    else
        # ファイルベースのマッチが見つからない場合は従来の-tオプションを使用
        echo "[PATTERN-NAME] テスト名マッチで実行: $pattern"
        execute_command "npm run check" "$mode" && \
        execute_vitest "-t '$pattern'" "$mode"
    fi
}

# 高速テスト実行（型チェックとlintをスキップ）
cmd_quick() {
    local mode="$(get_execution_mode)"
    
    echo "[QUICK] 高速テスト実行（型チェック・lintスキップ）"
    
    execute_vitest "test/" "$mode"
}

# 関連テストを実行
cmd_related() {
    local src_file="$1"
    local mode="$(get_execution_mode)"

    [[ -f "$src_file" ]] || { echo "[ERROR] ソースファイルが見つかりません: $src_file" >&2; return 1; }

    # *.svelteファイルの場合はStorybookテストを検索
    if [[ "$src_file" == *.svelte ]]; then
        local base_name="$(basename "$src_file" .svelte)"
        local story_files=()
        local search_dir=""

        # ソースファイルのパスに応じて検索ディレクトリを決定
        if [[ "$src_file" == src/routes/* ]]; then
            search_dir="src/stories/pages"
        elif [[ "$src_file" == src/lib/components/* ]]; then
            search_dir="src/stories"
        else
            search_dir="src/stories"
        fi

        # 検索ディレクトリが存在する場合のみ検索
        if [[ -d "$search_dir" ]]; then
            local temp_file="$TEMP_DIR/stories_$$"
            mkdir -p "$TEMP_DIR"

            # src/lib/componentsの場合、src/stories/pagesを除外するfindオプション
            local exclude_pages=""
            if [[ "$src_file" == src/lib/components/* ]]; then
                exclude_pages="-path src/stories/pages -prune -o"
            fi

            # 1. 完全なファイル名マッチを試行
            if [[ -n "$exclude_pages" ]]; then
                find "$search_dir" $exclude_pages -name "${base_name}.stories.svelte" -type f -print0 2>/dev/null > "$temp_file"
            else
                find "$search_dir" -name "${base_name}.stories.svelte" -type f -print0 2>/dev/null > "$temp_file"
            fi
            while IFS= read -r -d '' file; do
                story_files+=("$file")
            done < "$temp_file"

            # 2. 完全マッチで見つからない場合、パスからキーワードを抽出して検索
            if [[ ${#story_files[@]} -eq 0 ]]; then
                # パスをディレクトリ名に分解してキーワード抽出（[id]などの動的部分を除外）
                local path_parts=($(echo "$src_file" | tr '/' '\n' | grep -v '^\[' | grep -v '^+' | grep -v '^src$' | grep -v '^routes$' | grep -v '^lib$' | grep -v '^components$'))

                # 一時ファイルをクリア
                > "$temp_file"

                # 各キーワードで検索（大文字小文字を区別しない）
                # 複数形・単数形の違いを考慮するため、部分一致で幅広く検索
                for keyword in "${path_parts[@]}"; do
                    [[ -z "$keyword" ]] && continue

                    # kebab-caseの場合、ハイフンを除去したバージョンも検索（例: double-check → doublecheck）
                    local keyword_no_hyphen="${keyword//-/}"

                    # sで終わる場合は単数形も、sで終わらない場合は複数形も検索
                    if [[ "$keyword" == *s ]]; then
                        local singular="${keyword%s}"
                        local singular_no_hyphen="${keyword_no_hyphen%s}"
                        if [[ -n "$exclude_pages" ]]; then
                            find "$search_dir" $exclude_pages -iname "*${keyword}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" $exclude_pages -iname "*${keyword_no_hyphen}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" $exclude_pages -iname "*${singular}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" $exclude_pages -iname "*${singular_no_hyphen}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                        else
                            find "$search_dir" -iname "*${keyword}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" -iname "*${keyword_no_hyphen}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" -iname "*${singular}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" -iname "*${singular_no_hyphen}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                        fi
                    else
                        if [[ -n "$exclude_pages" ]]; then
                            find "$search_dir" $exclude_pages -iname "*${keyword}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" $exclude_pages -iname "*${keyword_no_hyphen}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" $exclude_pages -iname "*${keyword}s*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" $exclude_pages -iname "*${keyword_no_hyphen}s*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                        else
                            find "$search_dir" -iname "*${keyword}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" -iname "*${keyword_no_hyphen}*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" -iname "*${keyword}s*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                            find "$search_dir" -iname "*${keyword_no_hyphen}s*.stories.svelte" -type f -print0 2>/dev/null >> "$temp_file"
                        fi
                    fi
                done

                # 重複を除いて配列に格納
                local -a seen_files=()
                while IFS= read -r -d '' file; do
                    [[ -z "$file" ]] && continue
                    # 重複チェック
                    local is_duplicate=false
                    if [[ ${#seen_files[@]} -gt 0 ]]; then
                        for seen in "${seen_files[@]}"; do
                            [[ "$file" == "$seen" ]] && is_duplicate=true && break
                        done
                    fi
                    if [[ "$is_duplicate" == "false" ]]; then
                        story_files+=("$file")
                        seen_files+=("$file")
                    fi
                done < "$temp_file"
            fi
        fi

        # 結果の処理
        if [[ ${#story_files[@]} -eq 1 ]]; then
            echo "[STORYBOOK] Storybookテスト検出: $src_file → ${story_files[0]}"
            echo "[INFO] Storybookテストは 'npm run test:storybook' で実行してください"
            return 0
        elif [[ ${#story_files[@]} -gt 1 ]]; then
            echo "[STORYBOOK] 複数のStorybookテストを検出: $src_file"
            printf '  - %s\n' "${story_files[@]}"
            echo "[INFO] Storybookテストは 'npm run test:storybook' で実行してください"
            return 0
        else
            echo "[INFO] Storybookテストが見つかりませんでした: $src_file"
            if [[ "$src_file" == src/routes/* ]]; then
                echo "[INFO] テストを作成する場合は src/stories/pages/ 配下に ${base_name}.stories.svelte を作成してください"
            else
                echo "[INFO] テストを作成する場合は src/stories/ 配下に ${base_name}.stories.svelte を作成してください"
            fi
            return 0
        fi
    fi

    # 通常のテストファイル検索
    local test_result
    test_result="$(resolve_test_file "$src_file")" || true

    if [[ "$test_result" == pattern:* ]]; then
        local pattern="${test_result#pattern:}"
        echo "[FALLBACK] テストファイル未検出 → パターンマッチ使用: $pattern"
        execute_command "npm run check" "$mode" && \
        execute_vitest "-t '$pattern'" "$mode"
    else
        echo "[MATCHED] 関連テスト検出: $src_file → $test_result"
        execute_command "npm run check" "$mode" && \
        execute_vitest "'$test_result'" "$mode"
    fi
}

# 使用方法を表示
show_usage() {
    cat << 'EOF'
開発支援スクリプト v3.0

使用方法:
  ./scripts/dev.sh <command> [options]

コマンド:
  file <path>      特定のテストファイルを実行
  related <path>   ソースファイルの関連テストを実行
  pattern <pat>    パターンマッチでテスト実行
  quick           高速テスト実行（型チェック・ lint スキップ）

オプション:
  --verbose       詳細ログ表示（test/setup.ts の VITEST_CONSOLE_LOG 連携）

例:
  ./scripts/dev.sh related src/app/utils/breakdown-utils.ts
  ./scripts/dev.sh file test/utils/breakdown-utils.test.ts --verbose
  ./scripts/dev.sh pattern breakdown-template
  ./scripts/dev.sh quick --verbose
EOF
}


# メイン関数
main() {
    parse_arguments "$@"
    if [[ ${#ORIGINAL_ARGS[@]} -gt 0 ]]; then
        set -- "${ORIGINAL_ARGS[@]}"
    else
        set --
    fi
    
    local command="${1:-}"
    
    if [[ -z "$command" ]]; then
        echo "[ERROR] コマンドを指定してください" >&2
        show_usage
        exit 1
    fi
    
    case "$command" in
        "file")
            [[ -n "${2:-}" ]] || { echo "[ERROR] ファイルパスを指定してください" >&2; show_usage; exit 1; }
            cmd_file "$2"
            ;;
        "pattern")
            [[ -n "${2:-}" ]] || { echo "[ERROR] パターンを指定してください" >&2; show_usage; exit 1; }
            cmd_pattern "$2"
            ;;
        "quick")
            cmd_quick
            ;;
        "related")
            [[ -n "${2:-}" ]] || { echo "[ERROR] ソースファイルパスを指定してください" >&2; show_usage; exit 1; }
            cmd_related "$2"
            ;;
        "-h"|"--help"|"help")
            show_usage
            exit 0
            ;;
        *)
            echo "[ERROR] 不明なコマンド: $command" >&2
            show_usage
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"