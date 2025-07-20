import path from "path";
import {
  Project,
  SyntaxKind,
  UnionTypeNode,
  VariableDeclarationKind,
} from "ts-morph";

const project = new Project();
const outputFilePath = path.join("src", "lib", "generated-models.ts");
const outputFile = project.createSourceFile(
  outputFilePath,
  `// Auto generated via generate-models.ts at ${new Date().toISOString()}`,
  {
    overwrite: true,
  }
);

const packages = [
  {
    moduleName: "@ai-sdk/openai",
    typeName: "OpenAIChatModelId",
    provider: "OpenAI",
    id: "openai",
  },
  {
    moduleName: "@ai-sdk/anthropic",
    typeName: "AnthropicMessagesModelId",
    provider: "Anthropic",
    id: "anthropic",
  },
  {
    moduleName: "@ai-sdk/google-vertex",
    typeName: "GoogleVertexModelId",
    provider: "Google Vertex",
    id: "google-vertex",
  },
  {
    moduleName: "@ai-sdk/groq",
    typeName: "GroqChatModelId",
    provider: "Groq",
    id: "groq",
  },
  {
    moduleName: "@ai-sdk/google",
    typeName: "GoogleGenerativeAIModelId",
    provider: "Google Generative AI",
    id: "google",
  },
];

type LLMProvider = {
  id: string;
  models: string[];
  provider: string;
};

const providers: Record<string, LLMProvider> = {};

for (const pkg of packages) {
  const pkgTypes = project.addSourceFileAtPath(
    `node_modules/${pkg.moduleName}/dist/index.d.ts`
  );

  const typeAlias = pkgTypes.getTypeAliasOrThrow(pkg.typeName);
  const typeNode = typeAlias.getTypeNodeOrThrow();

  if (typeNode.getKind() === SyntaxKind.UnionType) {
    const unionType = typeNode.asKindOrThrow(SyntaxKind.UnionType);

    const literals = unionType
      .getTypeNodes()
      .map((node) => {
        if (node.getKind() === SyntaxKind.LiteralType) {
          return node.getText();
        }
        return null;
      })
      .filter((v): v is string => v !== null)
      .map((v) => v.replace(/^'/, "").replace(/'$/, ""));

    providers[pkg.provider] = {
      id: pkg.id,
      models: literals,
      provider: pkg.moduleName,
    };
  } else {
    console.error("Expected union type, got", typeNode.getKindName());
  }
}

outputFile.addVariableStatement({
  declarationKind: VariableDeclarationKind.Const,
  isExported: true,
  declarations: [
    {
      name: "providers",
      initializer: JSON.stringify(providers, null, 2),
    },
  ],
});

outputFile.saveSync();
