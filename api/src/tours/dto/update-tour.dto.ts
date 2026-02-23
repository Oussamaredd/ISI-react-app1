import { PartialType } from '@nestjs/mapped-types';

import { CreateTourDto } from './create-tour.dto.js';

export class UpdateTourDto extends PartialType(CreateTourDto) {}
