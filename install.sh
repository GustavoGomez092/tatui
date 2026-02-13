#!/usr/bin/env bash
set -euo pipefail

# TATUI Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/GustavoGomez092/tatui/main/install.sh | bash

REPO="GustavoGomez092/tatui"
INSTALL_DIR="${TATUI_INSTALL_DIR:-$HOME/.tatui}"
BIN_NAME="tatui"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[info]${NC} $1"; }
ok()    { echo -e "${GREEN}[ok]${NC} $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1" >&2; exit 1; }

# --- Preflight checks ---

check_node() {
  if ! command -v node &>/dev/null; then
    error "Node.js is required but not installed. Install Node.js 20+ from https://nodejs.org"
  fi

  local node_version
  node_version=$(node -v | sed 's/^v//')
  local major
  major=$(echo "$node_version" | cut -d. -f1)

  if [ "$major" -lt 20 ]; then
    error "Node.js >= 20 required (found v${node_version}). Update at https://nodejs.org"
  fi

  ok "Node.js v${node_version}"
}

check_npm() {
  if ! command -v npm &>/dev/null; then
    error "npm is required but not found."
  fi
  ok "npm $(npm -v)"
}

check_git() {
  if ! command -v git &>/dev/null; then
    error "git is required but not found."
  fi
  ok "git $(git --version | awk '{print $3}')"
}

# --- Install ---

install_tatui() {
  info "Installing TATUI to ${INSTALL_DIR}..."

  # Clone or update
  if [ -d "$INSTALL_DIR" ]; then
    info "Existing installation found, updating..."
    git -C "$INSTALL_DIR" fetch origin main --quiet
    git -C "$INSTALL_DIR" reset --hard origin/main --quiet
  else
    git clone --depth 1 "https://github.com/${REPO}.git" "$INSTALL_DIR" --quiet
  fi

  ok "Source cloned"

  # Install dependencies
  info "Installing dependencies..."
  cd "$INSTALL_DIR"
  npm install --production=false --silent 2>/dev/null
  ok "Dependencies installed"

  # Build
  info "Building..."
  npm run build --silent 2>/dev/null
  ok "Build complete"
}

# --- Link binary ---

link_binary() {
  local bin_dir=""
  local shell_config=""

  # Determine shell config file
  case "${SHELL:-/bin/bash}" in
    */zsh)  shell_config="$HOME/.zshrc" ;;
    */bash)
      if [ -f "$HOME/.bash_profile" ]; then
        shell_config="$HOME/.bash_profile"
      else
        shell_config="$HOME/.bashrc"
      fi
      ;;
    */fish) shell_config="$HOME/.config/fish/config.fish" ;;
    *)      shell_config="$HOME/.profile" ;;
  esac

  # Try to find a writable bin directory already in PATH
  for dir in "$HOME/.local/bin" "$HOME/bin" "/usr/local/bin"; do
    if [ -d "$dir" ] && echo "$PATH" | tr ':' '\n' | grep -qx "$dir"; then
      bin_dir="$dir"
      break
    fi
  done

  # Fallback: create ~/.local/bin
  if [ -z "$bin_dir" ]; then
    bin_dir="$HOME/.local/bin"
    mkdir -p "$bin_dir"

    # Add to PATH in shell config
    if [ -n "$shell_config" ] && ! grep -q "$bin_dir" "$shell_config" 2>/dev/null; then
      echo "" >> "$shell_config"
      echo "# TATUI" >> "$shell_config"
      echo "export PATH=\"${bin_dir}:\$PATH\"" >> "$shell_config"
      warn "Added ${bin_dir} to PATH in ${shell_config}"
      warn "Run: source ${shell_config}  (or open a new terminal)"
    fi
  fi

  # Create symlink
  ln -sf "${INSTALL_DIR}/dist/cli.js" "${bin_dir}/${BIN_NAME}"
  chmod +x "${INSTALL_DIR}/dist/cli.js"

  ok "Linked ${BIN_NAME} → ${bin_dir}/${BIN_NAME}"
}

# --- Update only ---

update_tatui() {
  if [ ! -d "$INSTALL_DIR" ]; then
    error "TATUI is not installed. Run without --update to install."
  fi

  echo ""
  echo -e "${CYAN}Updating TATUI...${NC}"
  echo ""

  check_node
  check_npm
  check_git
  echo ""

  local before
  before=$(git -C "$INSTALL_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")

  install_tatui

  local after
  after=$(git -C "$INSTALL_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")

  echo ""
  if [ "$before" = "$after" ]; then
    ok "Already up to date."
  else
    ok "Updated: ${before:0:7} → ${after:0:7}"
  fi
  echo ""
}

# --- Main ---

main() {
  # Handle flags
  case "${1:-}" in
    --update|-u)
      update_tatui
      return
      ;;
    --help|-h)
      echo "TATUI Installer"
      echo ""
      echo "Usage:"
      echo "  install.sh            Install TATUI (or update if already installed)"
      echo "  install.sh --update   Update to the latest version"
      echo "  install.sh --help     Show this help"
      echo ""
      echo "Environment:"
      echo "  TATUI_INSTALL_DIR     Override install directory (default: ~/.tatui)"
      return
      ;;
  esac

  echo ""
  echo -e "${CYAN}╔══════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   TATUI — Weekly Kanban Board    ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════╝${NC}"
  echo ""

  info "Checking requirements..."
  check_node
  check_npm
  check_git
  echo ""

  install_tatui
  echo ""

  link_binary
  echo ""

  echo -e "${GREEN}✓ TATUI installed successfully!${NC}"
  echo ""
  echo "  Run:    ${BIN_NAME}"
  echo "  Help:   ${BIN_NAME} help"
  echo "  Update: curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash -s -- --update"
  echo ""
}

main "$@"
