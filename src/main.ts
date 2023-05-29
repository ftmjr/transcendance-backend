import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
      .setTitle('Median')
      .setDescription('The Median API')
      .setVersion('0.1')
      .addServer('/api')
      .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('prisma', app, document);

  await app.listen(3001, "0.0.0.0");
}
bootstrap();
