#!/bin/bash

# Dev Container Group Manager - 开发辅助脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."

    local missing_deps=()

    if ! command_exists node; then
        missing_deps+=("Node.js")
    fi

    if ! command_exists npm; then
        missing_deps+=("npm")
    fi

    if ! command_exists code; then
        missing_deps+=("VS Code")
    fi

    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi

    if [ ${#missing_deps[@]} -eq 0 ]; then
        print_success "所有依赖已安装"
        return 0
    else
        print_error "缺少以下依赖: ${missing_deps[*]}"
        return 1
    fi
}

# 显示版本信息
show_versions() {
    print_info "版本信息:"
    echo "  Node.js: $(node --version 2>/dev/null || echo '未安装')"
    echo "  npm: $(npm --version 2>/dev/null || echo '未安装')"
    echo "  VS Code: $(code --version 2>/dev/null | head -n 1 || echo '未安装')"
    echo "  Docker: $(docker --version 2>/dev/null || echo '未安装')"
}

# 安装依赖
install_deps() {
    print_info "安装 npm 依赖..."
    npm install
    print_success "依赖安装完成"
}

# 编译项目
compile() {
    print_info "编译 TypeScript..."
    npm run compile
    print_success "编译完成"
}

# 代码检查
lint() {
    print_info "运行 ESLint..."
    npm run lint
    print_success "代码检查通过"
}

# 清理项目
clean() {
    print_info "清理项目..."
    rm -rf out/
    rm -rf node_modules/
    rm -f *.vsix
    print_success "清理完成"
}

# 打包插件
package() {
    print_info "打包插件..."

    if ! command_exists vsce; then
        print_warning "vsce 未安装，正在安装..."
        npm install -g @vscode/vsce
    fi

    vsce package
    print_success "打包完成"

    # 显示生成的文件
    local vsix_file=$(ls -t *.vsix 2>/dev/null | head -n 1)
    if [ -n "$vsix_file" ]; then
        print_info "生成的文件: $vsix_file"
    fi
}

# 安装插件
install_extension() {
    local vsix_file=$(ls -t *.vsix 2>/dev/null | head -n 1)

    if [ -z "$vsix_file" ]; then
        print_error "未找到 .vsix 文件，请先运行打包"
        return 1
    fi

    print_info "安装插件: $vsix_file"
    code --install-extension "$vsix_file"
    print_success "插件安装完成"
    print_warning "请重启 VS Code 以激活插件"
}

# 卸载插件
uninstall_extension() {
    print_info "卸载插件..."
    code --uninstall-extension dev-container-group-manager
    print_success "插件卸载完成"
}

# 运行调试
debug() {
    print_info "启动调试模式..."
    print_info "请在 VS Code 中按 F5 启动调试"
    code .
}

# 检查 Project Manager 配置
check_project_manager() {
    print_info "检查 Project Manager 配置..."

    local config_paths=(
        "$HOME/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json"
        "$HOME/.config/Code/User/globalStorage/alefragnani.project-manager/projects.json"
        "$HOME/AppData/Roaming/Code/User/globalStorage/alefragnani.project-manager/projects.json"
    )

    local found=false
    for path in "${config_paths[@]}"; do
        if [ -f "$path" ]; then
            print_success "找到配置文件: $path"

            # 显示项目数量
            local project_count=$(cat "$path" | grep -o '"rootPath"' | wc -l)
            print_info "项目数量: $project_count"
            found=true
            break
        fi
    done

    if [ "$found" = false ]; then
        print_warning "未找到 Project Manager 配置文件"
        print_info "请确保已安装 Project Manager 扩展并添加了项目"
    fi
}

# 检查 Docker 状态
check_docker() {
    print_info "检查 Docker 状态..."

    if ! command_exists docker; then
        print_error "Docker 未安装"
        return 1
    fi

    if ! docker ps >/dev/null 2>&1; then
        print_error "Docker 未运行，请启动 Docker Desktop"
        return 1
    fi

    print_success "Docker 正在运行"

    # 显示容器数量
    local container_count=$(docker ps -q | wc -l)
    print_info "运行中的容器: $container_count"

    # 显示资源使用
    print_info "Docker 资源使用:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -n 5
}

# 完整构建流程
build() {
    print_info "开始完整构建流程..."

    check_dependencies || return 1
    install_deps
    lint
    compile
    package

    print_success "构建完成！"
}

# 开发环境设置
setup() {
    print_info "设置开发环境..."

    check_dependencies || return 1
    show_versions
    install_deps
    compile
    check_project_manager
    check_docker

    print_success "开发环境设置完成！"
    print_info "运行 './dev.sh debug' 启动调试"
}

# 显示帮助信息
show_help() {
    cat << EOF
Dev Container Group Manager - 开发辅助脚本

用法: ./dev.sh [命令]

命令:
  setup              设置开发环境
  install            安装 npm 依赖
  compile            编译 TypeScript
  lint               运行代码检查
  clean              清理项目
  build              完整构建流程
  package            打包插件
  install-ext        安装插件到 VS Code
  uninstall-ext      从 VS Code 卸载插件
  debug              启动调试模式
  check-pm           检查 Project Manager 配置
  check-docker       检查 Docker 状态
  versions           显示版本信息
  help               显示此帮助信息

示例:
  ./dev.sh setup              # 首次设置开发环境
  ./dev.sh build              # 构建并打包插件
  ./dev.sh install-ext        # 安装插件到 VS Code
  ./dev.sh debug              # 启动调试模式

EOF
}

# 主函数
main() {
    case "${1:-help}" in
        setup)
            setup
            ;;
        install)
            install_deps
            ;;
        compile)
            compile
            ;;
        lint)
            lint
            ;;
        clean)
            clean
            ;;
        build)
            build
            ;;
        package)
            package
            ;;
        install-ext)
            install_extension
            ;;
        uninstall-ext)
            uninstall_extension
            ;;
        debug)
            debug
            ;;
        check-pm)
            check_project_manager
            ;;
        check-docker)
            check_docker
            ;;
        versions)
            show_versions
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
