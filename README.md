<div align="center">

# 📄 Linux.do Markdown Export

一个简单易用的 Linux.do 帖子 Markdown 导出脚本。

支持导出帖子正文，并可选择是否同时导出全部评论。

[![JavaScript](https://img.shields.io/badge/JavaScript-Userscript-F7DF1E?logo=javascript&logoColor=black)](./user.js)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-00485B?logo=tampermonkey)](https://www.tampermonkey.net/)
[![Linux.do](https://img.shields.io/badge/Website-linux.do-1E80FF)](https://linux.do/)

[一键安装脚本](https://raw.githubusercontent.com/daimon3332/Linux.do-Markdown-Export/refs/heads/main/user.js)

</div>

---

## ✨ 功能介绍

- 导出 Linux.do 帖子正文
- 可选择同时导出全部评论
- 自动生成 Markdown 文件
- 自动获取长帖中的全部楼层
- 保留帖子中的常见格式：
  - 标题
  - 粗体与斜体
  - 超链接
  - 图片
  - 代码块
  - 引用
  - 有序列表与无序列表
- 自动将相对链接转换为完整链接
- 自动过滤头像、表情图片等无关内容
- 导出过程中显示加载与转换进度

## 📦 安装方法

### 方法一：直接安装

1. 安装用户脚本管理器，例如：
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. 点击下面的链接：

   **[安装 Linux.do Markdown Export](https://raw.githubusercontent.com/daimon3332/Linux.do-Markdown-Export/refs/heads/main/user.js)**

3. 在脚本管理器页面中点击“安装”。

### 方法二：手动导入

1. 安装 Tampermonkey 或其他用户脚本管理器。
2. 打开本项目中的 [`user.js`](./user.js)。
3. 复制文件中的全部代码。
4. 打开 Tampermonkey 管理面板。
5. 点击“添加新脚本”。
6. 删除编辑器中的默认内容，然后粘贴脚本代码。
7. 按下 `Ctrl + S` 保存脚本。

## 🚀 使用方法

1. 登录 [Linux.do](https://linux.do/)。
2. 打开需要导出的帖子页面，例如：

   ```text
   https://linux.do/t/topic/123456
   ```

3. 页面右侧会出现一个蓝色的悬浮按钮。
4. 点击悬浮按钮后选择导出方式：

   - **导出帖子**：仅导出楼主发布的正文
   - **导出帖子 + 评论**：导出正文以及全部楼层评论

5. 等待页面显示“导出完成”，浏览器将自动下载 `.md` 文件。

## 📝 导出文件

仅导出帖子时，文件名格式为：

```text
帖子标题-帖子ID.md
```

同时导出评论时，文件名格式为：

```text
帖子标题-帖子ID-full.md
```

导出的 Markdown 内容大致如下：

```markdown
# 帖子标题

https://linux.do/t/123456

帖子正文内容……

---

@username1: 第一条评论……

@username2: 第二条评论……
```

## ⚠️ 注意事项

- 脚本仅在 Linux.do 帖子页面运行。
- 请确保脚本管理器中已经启用该脚本。
- 导出大量评论时可能需要等待一段时间，请勿重复点击导出按钮。
- 脚本只能导出当前账号有权限查看的帖子内容。
- Markdown 文件中的图片仍然引用原始网络地址，并不会下载到本地。
- 如果安装脚本后没有看到导出按钮，请刷新帖子页面后重试。

## 🛠️ 常见问题

### 页面右侧没有出现导出按钮

请依次检查：

1. Tampermonkey 是否已经启用。
2. 本脚本是否已经启用。
3. 当前页面是否为 Linux.do 帖子页面。
4. 刷新页面后是否恢复正常。

### 导出的评论不完整

请选择“导出帖子 + 评论”，并等待脚本显示导出完成。

对于评论数量较多的帖子，脚本需要分批加载全部楼层，因此可能需要较长时间。

### 导出的图片无法显示

导出的 Markdown 文件使用 Linux.do 帖子中的原始图片链接。

请确认：

- 当前设备能够正常访问图片地址
- 图片没有被删除
- 图片不需要额外的访问权限

## 🤝 贡献

欢迎提交 Issue 或 Pull Request。

你可以帮助完善：

- Markdown 格式转换
- 表格与复杂列表支持
- 评论排版
- 导出文件命名
- 页面交互与样式
- 其他 Discourse 论坛支持

## 📌 免责声明

本项目仅用于个人内容整理、学习与备份。

导出和使用相关内容时，请遵守 Linux.do 的使用规则，并尊重原作者的版权及隐私。

---

<div align="center">

如果这个项目对你有帮助，欢迎点一个 ⭐ Star。

</div>
