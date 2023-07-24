import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from 'nestjs-prisma';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import { ConfigService } from '@nestjs/config';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const frontendUrl = 'https://' + configService.get<string>('URL');
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.enableCors({
    origin: frontendUrl,
  });
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));
  app.use(cookieParser());
  app.use(compression());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('FTMJR Pong')
    .setDescription('Transcendancee API Documentation')
    .setVersion('0.1')
    .addServer('/api')
    .addCookieAuth('REFRESH_TOKEN')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/', app, document);

  await app.listen(3001, '0.0.0.0');
}
bootstrap();
