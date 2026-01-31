import { IsUUID } from 'class-validator';

export class AssignHotelDto {
  @IsUUID()
  hotelId!: string;
}
