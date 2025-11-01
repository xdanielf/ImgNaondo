# ImgNaondo

一款专为 Cloudflare Workers 设计的快速、精悍且功能强大的图床。

## 配置
创建一个 Workers 项目、一个名为“imgnaondo”的 R2 存储桶（绑定名称为“IMAGES”），和一个名为“PASSWORD”的环境变量，将值设置为你的密码，并绑定的 Workers。


将 workers.js 中的代码复制并替换原有代码即可。
