import { declareRegister } from "aileen-core";
import { Config } from "./config";
import { koaSwagger } from "koa2-swagger-ui";
import { Document } from "./document";
import { ConfigBean } from "./injector";
import {
  Context,
  ControllerComponentID,
  Router,
  RouterBean,
} from "aileen-httpd";
import Koa from "koa";

/**
 * 声明启动器
 */
export const booter = declareRegister(async (app, next) => {
  // 执行应用启动
  await next();

  // 插件未配置
  if (!app.has(ConfigBean.ID)) return;

  // 服务不启动
  const config = app.get<Config>(ConfigBean.ID);
  if (!config.enable) return;

  // 参数解析
  const routePrefix = config.indexPage || "/docs/index.html";
  const url = config.apiJson || "/docs/data.json";

  // 文档UI
  const swagger = koaSwagger({
    routePrefix,
    hideTopbar: true,
    title: config.title,
    swaggerOptions: { url },
  });

  // 文档对象
  const document = new Document();
  document.host = config.host;
  document.title = config.title;
  document.version = config.version;
  document.description = config.description;

  // 注册控制器
  const controllers = app.getAllByTag(ControllerComponentID);
  for (const controller of controllers) {
    document.register(controller);
  }

  // 导入服务
  const server = app.get<Koa>(Koa);
  const router = app.get<Router>(RouterBean.ID);

  // 配置服务
  server.use(swagger);
  router.bind("GET", url).to((ctx: Context) => {
    ctx.body = document.toJSON();
  });
});
