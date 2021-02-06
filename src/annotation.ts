import { Annotation } from "aileen-annotation";
import { Schema } from "./document";

export const TagAnnotation = new Annotation<{
  name: string;
  description?: string;
}>();

export const Tag = (name: string, description?: string): ClassDecorator =>
  TagAnnotation.decorator({ name, description });

export const SummaryAnnotation = new Annotation<{
  value: string;
}>();

export const Summary = (value: string): MethodDecorator =>
  SummaryAnnotation.decorator({ value });

export const DescriptionAnnotation = new Annotation<{
  value: string;
}>();

export const Description = (
  value: string
): MethodDecorator & ParameterDecorator =>
  DescriptionAnnotation.decorator({ value });

/**
 * 响应注解
 */
export const ResponseBodyAnnotation = new Annotation<{
  description: string;
  type?: Array<any> | Function | Schema;
  schema?: Function | Schema;
}>();

/**
 * 响应状态
 */
export const ResponseBody = (
  description: string,
  type?: Array<any> | Function | Schema,
  schema?: Function | Schema
): MethodDecorator =>
  ResponseBodyAnnotation.decorator({
    description,
    type,
    schema,
  });

/**
 * 响应注解
 */
export const ResponseExceptionAnnotation = new Annotation<{
  code: number;
  description: string;
  type?: any;
}>();

/**
 * 响应状态
 */
export const ResponseException = (
  code: number,
  description: string,
  type?: any
): ParameterDecorator =>
  ResponseExceptionAnnotation.decorator({ code, description, type });

/**
 * 响应模型注解
 */
export const ResponseModelAnnotation = new Annotation<{
  name?: string;
}>();

/**
 * 响应模型类声明
 */
export const ResponseModel = (name?: string): ClassDecorator =>
  ResponseModelAnnotation.decorator({ name });

/**
 * 响应模型属性注解
 */
export const ModelPropertieAnnotation = new Annotation<{
  description: string;
  type?: "array" | "enum";
  schema?: Schema | Function;
  enum?: any[];
}>();

/**
 * 响应模型类声明
 */
export const ModelPropertie = (
  description: string,
  schema?: Schema | Function
): PropertyDecorator & MethodDecorator =>
  ModelPropertieAnnotation.decorator({
    description,
    schema,
  });

/**
 * 响应模型类声明
 */
export const ModelArrayPropertie = (
  description: string,
  schema: Schema | Function
): PropertyDecorator & MethodDecorator =>
  ModelPropertieAnnotation.decorator({
    description,
    type: "array",
    schema,
  });

/**
 * 响应模型类声明
 */
export const ModelEnumPropertie = (
  description: string,
  values: any[]
): PropertyDecorator & MethodDecorator =>
  ModelPropertieAnnotation.decorator({
    description,
    type: "enum",
    enum: values,
  });

/**
 * 响应模型属性注解
 */
export const ModelPropertieNameAnnotation = new Annotation<{
  name: string;
}>();

/**
 * 响应模型类声明
 */
export const ModelPropertieName = (
  name: string
): PropertyDecorator & MethodDecorator =>
  ModelPropertieNameAnnotation.decorator({
    name,
  });
