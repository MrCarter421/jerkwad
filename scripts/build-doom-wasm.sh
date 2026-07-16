#!/bin/bash
# ============================================================================
# Reproducible build of play/websockets-doom.{js,wasm} — Chocolate Doom
# compiled to WebAssembly with WebSocket netplay (cloudflare/doom-wasm fork).
#
# Tested on Ubuntu 24.04 with the distro emscripten (3.1.6). Newer emsdk
# versions also work and need FEWER workarounds (skip steps 2-4).
#
# Usage:  ./scripts/build-doom-wasm.sh [workdir]
# ============================================================================
set -euo pipefail
WORK="${1:-/tmp/doom-wasm-build}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 1. Toolchain -------------------------------------------------------------
command -v emcc >/dev/null || sudo apt-get install -y emscripten
sudo apt-get install -y automake autoconf libtool pkg-config

# 2. Debian's emscripten ships a FROZEN system cache — use a writable one.
export EM_CACHE_DIR="$WORK/emcache"
mkdir -p "$EM_CACHE_DIR"
cp -rn /usr/share/emscripten/cache/* "$EM_CACHE_DIR/" 2>/dev/null || true
cat > "$WORK/emconfig.py" <<EOF
EMSCRIPTEN_ROOT = '/usr/share/emscripten'
LLVM_ROOT = '/usr/bin'
BINARYEN_ROOT = '/usr'
NODE_JS = '/usr/bin/node'
JAVA = 'java'
CACHE = '$EM_CACHE_DIR'
FROZEN_CACHE = False
CLOSURE_COMPILER = 'closure-compiler'
LLVM_ADD_VERSION = '15'
CLANG_ADD_VERSION = '15'
EOF
export EM_CONFIG="$WORK/emconfig.py"

# 3. emscripten-ports ZIP downloads fail two ways in restricted environments:
#    (a) GitHub re-archives change the pinned sha512, (b) proxies may block
#    codeload URLs. Pre-seed the ports cache from git clones instead.
seed_port() { # name subdir giturl tag url
  local name="$1" subdir="$2" git="$3" tag="$4" url="$5"
  local dest="$EM_CACHE_DIR/ports/$name/$subdir"
  [ -d "$dest" ] && return 0
  rm -rf "$EM_CACHE_DIR/ports/$name"
  git clone --depth 1 --branch "$tag" "$git" "$dest"
  rm -rf "$dest/.git"
  printf '%s' "$url" > "$EM_CACHE_DIR/ports/$name/.emscripten_url"
}
mkdir -p "$EM_CACHE_DIR/ports"
seed_port sdl2       SDL-release-2.0.20       https://github.com/libsdl-org/SDL.git              release-2.0.20 https://github.com/libsdl-org/SDL/archive/release-2.0.20.zip
seed_port sdl2_mixer SDL2_mixer-release-2.0.2 https://github.com/emscripten-ports/SDL2_mixer.git release-2.0.2  https://github.com/emscripten-ports/SDL2_mixer/archive/release-2.0.2.zip
seed_port sdl2_net   SDL2_net-version_2       https://github.com/emscripten-ports/SDL2_net.git   version_2      https://github.com/emscripten-ports/SDL2_net/archive/version_2.zip
seed_port ogg        Ogg-version_1            https://github.com/emscripten-ports/ogg.git        version_1      https://github.com/emscripten-ports/ogg/archive/version_1.zip
seed_port vorbis     Vorbis-version_1         https://github.com/emscripten-ports/vorbis.git     version_1      https://github.com/emscripten-ports/vorbis/archive/version_1.zip

# 4. (Only needed if port zips still get fetched and hash-fail.) Debian's
#    emscripten pins sha512 of GitHub archive zips that GitHub has since
#    re-compressed; relax tools/ports/__init__.py to warn instead of abort.
#    We seed the cache above so this usually never triggers.

# 5. Source ------------------------------------------------------------------
[ -d "$WORK/doom-wasm" ] || git clone --depth 1 https://github.com/cloudflare/doom-wasm.git "$WORK/doom-wasm"
cd "$WORK/doom-wasm"

# clang >= 15 renames `int main(int, char**)` to `__main_argc_argv`, which
# emscripten 3.1.6's linker does not map back to `main` — the entire game
# gets GC'd into a ~30 KB stub. Force the symbol name with an asm label.
grep -q '__asm__("main")' src/i_main.c || python3 - <<'PYEOF'
s = open('src/i_main.c').read()
s = s.replace('int main(int argc, char **argv)',
              'int main(int argc, char **argv) __asm__("main");\nint main(int argc, char **argv)')
open('src/i_main.c', 'w').write(s)
PYEOF

# 6. Configure + compile objects --------------------------------------------
emconfigure autoreconf -fiv
ac_cv_exeext=".html" emconfigure ./configure --host=none-none-none
emmake make -j"$(nproc)" -k || true   # -k: the .html link step fails on
                                      # missing `htmlmin`; objects still build.

# 7. Final link — straight to .js (skips emcc's html-shell + htmlmin) --------
cd src
OBJS="i_main.o i_system.o m_argv.o m_misc.o aes_prng.o d_event.o d_iwad.o d_loop.o d_mode.o deh_str.o gusconf.o i_cdmus.o i_endoom.o i_glob.o i_input.o i_joystick.o i_midipipe.o i_musicpack.o i_oplmusic.o i_pcsound.o i_sdlmusic.o i_sdlsound.o i_sound.o i_timer.o i_video.o i_videohr.o midifile.o mus2mid.o m_bbox.o m_cheat.o m_config.o m_controls.o m_fixed.o net_client.o net_common.o net_dedicated.o net_gui.o net_io.o net_loop.o net_websockets.o net_packet.o net_petname.o net_query.o net_server.o net_structrw.o sha1.o memio.o tables.o v_diskicon.o v_video.o w_checksum.o w_main.o w_wad.o w_file.o w_file_stdc.o w_file_posix.o w_file_win32.o w_merge.o z_zone.o deh_io.o deh_main.o deh_mapping.o deh_text.o"
emcc -I../textscreen -I../opl -I../pcsound -O3 \
  -s INVOKE_RUN=1 -s USE_SDL=2 -s USE_SDL_MIXER=2 -s USE_SDL_NET=2 \
  -s ASSERTIONS=0 -s WASM=1 -s ALLOW_MEMORY_GROWTH=0 -s FORCE_FILESYSTEM=1 \
  -s "EXTRA_EXPORTED_RUNTIME_METHODS=['FS','ccall','callMain']" \
  -s EXIT_RUNTIME=1 -s USE_PTHREADS=0 -s TOTAL_MEMORY=64MB \
  -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s ASYNCIFY \
  -o websockets-doom.js \
  $OBJS doom/libdoom.a ../textscreen/libtextscreen.a \
  ../pcsound/libpcsound.a ../opl/libopl.a -lwebsocket.js -lm

# 8. Install into the repo ----------------------------------------------------
cp websockets-doom.js websockets-doom.wasm "$REPO_DIR/play/"
echo "OK: $(ls -la "$REPO_DIR"/play/websockets-doom.*)"
