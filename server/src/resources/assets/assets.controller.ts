import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';

@Controller()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.createAsset(createAssetDto);
  }

  @Get()
  findAll(@Query() query: AssetQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findById(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.remove(id);
  }
}
