import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReconcileTransactionsDto {
  @ApiProperty({
    description: 'Array of transaction IDs to mark as reconciled',
    type: [String],
    example: ['txn-id-1', 'txn-id-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  transactionIds: string[];
}
