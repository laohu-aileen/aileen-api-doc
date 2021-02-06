import {
  ControllerAnnotation,
  HttpAnnotation,
  HeaderAnnotation,
  QueryAnnotation,
  PathAnnotation,
  BodyAnnotation,
  ResponseAnnotation,
  RequiredAnnotation,
} from "aileen-httpd";
import { join } from "path";
import { ModelPropertieNameAnnotation } from "./annotation";
import {
  ResponseBodyAnnotation,
  ResponseModelAnnotation,
  ModelPropertieAnnotation,
} from "./annotation";
import {
  TagAnnotation,
  SummaryAnnotation,
  DescriptionAnnotation,
} from "./annotation";

interface Tag {
  name: string;
  description?: string;
}

export interface Schema {
  type?:
    | "integer"
    | "number"
    | "string"
    | "boolean"
    | "array"
    | "object"
    | "enum";
  format?:
    | "int32"
    | "int64"
    | "float"
    | "double"
    | "byte"
    | "binary"
    | "date"
    | "date-time"
    | "password";
  enum?: any[];
  default?: boolean;
  $ref?: string;
  items?: Schema;
  example?: any;
  description?: string;
  properties?: {
    [key: string]: Schema;
  };
  schema?: Schema;
}

interface Parameter extends Schema {
  in: "query" | "path" | "header" | "body";
  name: string;
  required?: boolean;
}

interface Responses {
  [code: string]: {
    description?: string;
    schema?: Schema;
  };
}

interface Api {
  summary: string;
  description?: string;
  tags: string[];
  consumes?: string[];
  produces?: string[];
  parameters: Parameter[];
  responses: Responses;
}

interface Definition {
  type: "object";
  required?: string[];
  properties: {
    [key: string]: Schema;
  };
}

export class Document {
  // 接口数据
  protected data: {
    swagger: string;
    schemes: string[];
    host?: string;
    info: {
      description?: string;
      version?: string;
      title?: string;
    };
    tags: Tag[];
    paths: {
      [key: string]: {
        [key: string]: Api;
      };
    };
    definitions: {
      [key: string]: Definition;
    };
  } = {
    swagger: "2.0",
    schemes: ["https", "http"],
    info: {},
    tags: [],
    paths: {},
    definitions: {},
  };

  /**
   * 域名
   */
  set host(value: string) {
    this.data.host = value;
  }

  /**
   * 描述
   */
  set description(value: string) {
    this.data.info.description = value;
  }

  /**
   * 版本
   */
  set version(value: string) {
    this.data.info.version = value;
  }

  /**
   * 标题
   */
  set title(value: string) {
    this.data.info.title = value;
  }

  /**
   * 添加标签
   * @param name
   * @param desc
   */
  protected addTag(name: string, desc?: string) {
    for (const tag of this.data.tags) {
      if (tag.name !== name) continue;
      if (tag.description !== undefined) return;
      tag.description = desc;
      return;
    }
    this.data.tags.push({
      name,
      description: desc,
    });
  }

  protected createDefinition(name: string, modal: Function) {
    if (this.data.definitions[name]) return;
    this.data.definitions[name] = {
      type: "object",
      properties: {},
    };
    const propertieRefs = ModelPropertieAnnotation.getRefPropertys(modal);
    for (const { key, type } of propertieRefs) {
      const ref = ModelPropertieAnnotation.getRef(modal, key);
      const pType = this.getType(ref.schema || type);

      const nameRef = ModelPropertieNameAnnotation.getRef(modal, key);
      const id = nameRef?.name || key.toString();

      switch (ref.type) {
        case "array": {
          this.data.definitions[name].properties[id] = {
            description: ref.description,
            type: "array",
            items: { ...(pType.schema ? pType.schema : pType) },
          };
          break;
        }
        case "enum": {
          this.data.definitions[name].properties[id] = {
            description: ref.description,
            type: "enum",
            enum: ref.enum,
          };
          break;
        }
        default: {
          this.data.definitions[name].properties[id] = {
            description: ref.description,
            ...(pType.schema ? pType.schema : pType),
          };
        }
      }
    }
  }

  /**
   * 获取类型
   * @param value
   */
  protected getType(value: any): Schema {
    switch (value) {
      case String: {
        return { type: "string" };
      }
      case Date:
      case Number: {
        return { type: "integer" };
      }
      case Boolean: {
        return { type: "boolean" };
      }
      default: {
        const ref = ResponseModelAnnotation.getRef(value);
        if (!ref) return { type: "object" };
        const key = ref.name || value.name;
        this.createDefinition(key, value);
        return { schema: { $ref: `#/definitions/${key}` } };
      }
    }
  }

  /**
   * 注册控制器
   * @param target
   */
  public register(target: Object) {
    if (!ControllerAnnotation.hasRef(target)) return;
    const { basePath, advice } = ControllerAnnotation.getRef(target);
    if (advice) return;
    const methods = HttpAnnotation.getRefMethods(target);

    // 标签注册
    const tags = TagAnnotation.getRefs(target);
    for (const { name, description } of tags) {
      this.addTag(name, description);
    }

    for (const { key, parameters } of methods) {
      const refs = HttpAnnotation.getRefs(target, key);
      const summaryRef = SummaryAnnotation.getRef(target, key);
      const descriptionRef = DescriptionAnnotation.getRef(target, key);

      for (const ref of refs) {
        // 路径解析
        const path = join(basePath, ref.path);

        // 新路径
        if (!this.data.paths[path]) {
          this.data.paths[path] = {};
        }

        // 参数解析
        const docParameters: Parameter[] = [];
        let bodySchema: { [key: string]: Schema };

        // 解析注解
        parameters.forEach((type, i) => {
          const pType = this.getType(type);
          const descriptionRef = DescriptionAnnotation.getRef(target, key, i);

          // 必填选项
          const reqRef = RequiredAnnotation.getRef(target, key, i);
          const reqOption: any = { required: false };
          if (reqRef) {
            reqOption.required = reqRef.value;
            if (reqRef.default !== undefined) {
              reqOption.default = reqRef.default;
            }
          }

          if (PathAnnotation.hasRef(target, key, i)) {
            const { name } = PathAnnotation.getRef(target, key, i);
            if (!name) return;
            return docParameters.push({
              in: "path",
              name,
              description: descriptionRef?.value || name,
              ...pType,
              ...reqOption,
            });
          }

          if (QueryAnnotation.hasRef(target, key, i)) {
            const { name } = QueryAnnotation.getRef(target, key, i);
            if (!name) return;
            return docParameters.push({
              in: "query",
              name,
              description: descriptionRef?.value || name,
              ...pType,
              ...reqOption,
            });
          }

          if (HeaderAnnotation.hasRef(target, key, i)) {
            const { name } = HeaderAnnotation.getRef(target, key, i);
            if (!name) return;
            return docParameters.push({
              in: "header",
              name,
              description: descriptionRef?.value || name,
              ...pType,
              ...reqOption,
            });
          }

          if (BodyAnnotation.hasRef(target, key, i)) {
            const { name } = BodyAnnotation.getRef(target, key, i);
            if (!name) return;
            if (!bodySchema) bodySchema = {};
            return (bodySchema[name] = {
              description: descriptionRef?.value || name,
              ...pType,
              ...reqOption,
            });
          }
        });

        // 挂载BODY注解
        if (bodySchema) {
          docParameters.push({
            in: "body",
            name: "body",
            schema: {
              type: "object",
              properties: bodySchema,
            },
          });
        }

        const responses: Responses = {};
        if (ResponseAnnotation.hasRef(target, key)) {
          const { status } = ResponseAnnotation.getRef(target, key);
          const option: any = {};
          responses[status.toString()] = option;
          const ref = ResponseBodyAnnotation.getRef(target, key);
          if (ref) {
            option.description = ref.description;
            if (ref.type === Array) {
              option.schema = { type: "array" };
              if (ResponseModelAnnotation.hasRef(ref.schema)) {
                option.schema.items = this.getType(ref.schema).schema;
              } else {
                option.schema.items = this.getType(ref.schema);
              }
            } else if (ref.type) {
              if (ResponseModelAnnotation.hasRef(ref.type)) {
                const type = this.getType(ref.type);
                Object.assign(option, type);
              } else {
                option.schema = ref.type;
              }
            }
          }
        } else {
          responses["200"] = {
            description: "Success",
          };
        }

        // 声明接口
        this.data.paths[path][ref.method.toLowerCase()] = {
          summary: summaryRef?.value || key.toString(),
          description: descriptionRef?.value,
          tags: tags.map(({ name }) => name),
          parameters: docParameters,
          consumes: ["application/json"],
          produces: ["application/json"],
          responses,
        };
      }
    }
  }

  /**
   * 转JSON
   */
  public toJSON() {
    return this.data;
  }
}
