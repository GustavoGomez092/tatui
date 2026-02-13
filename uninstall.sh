#!/usr/bin/env bash
set -euo pipefail

# TATUI Uninstaller
# Usage: curl -fsSL https://raw.githubusercontent.com/GustavoGomez092/tatui/main/uninstall.sh | bash

INSTALL_DIR="${TATUI_INSTALL_DIR:-$HOME/.tatui}"
BIN_NAME="tatui"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC} $1"; }
ok()    { echo -e "${GREEN}[ok]${NC} $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }

main() {
  echo ""
  echo -e "${CYAN}TATUI Uninstaller${NC}"
  echo ""

  # Remove symlink from common bin directories
  local removed_link=false
  for dir in "$HOME/.local/bin" "$HOME/bin" "/usr/local/bin"; do
    if [ -L "${dir}/${BIN_NAME}" ]; then
      rm -f "${dir}/${BIN_NAME}"
      ok "Removed symlink ${dir}/${BIN_NAME}"
      removed_link=true
    fi
  done

  if [ "$removed_link" = false ]; then
    # Try to find it anywhere in PATH
    local bin_path
    bin_path=$(command -v "$BIN_NAME" 2>/dev/null || true)
    if [ -n "$bin_path" ] && [ -L "$bin_path" ]; then
      rm -f "$bin_path"
      ok "Removed symlink ${bin_path}"
    else
      info "No symlink found in PATH"
    fi
  fi

  # Remove installation directory
  if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    ok "Removed ${INSTALL_DIR}"
  else
    info "Installation directory not found at ${INSTALL_DIR}"
  fi

  # Note about data
  local data_dir=""
  case "$(uname -s)" in
    Darwin) data_dir="$HOME/Library/Application Support/tatui" ;;
    Linux)  data_dir="${XDG_DATA_HOME:-$HOME/.local/share}/tatui" ;;
    *)      data_dir="$HOME/.local/share/tatui" ;;
  esac

  if [ -d "$data_dir" ]; then
    echo ""
    warn "Your task data is preserved at: ${data_dir}"
    warn "To remove it completely: rm -rf \"${data_dir}\""
  fi

  echo ""
  echo -e "${GREEN}✓ TATUI uninstalled.${NC}"
  echo ""
}

main "$@"
