import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import type { AuthUser } from '../../common/auth.types';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import {
  CreateCourtDto,
  CreateVenueDto,
  CreateVenuePricingRuleDto,
  ListVenueDto,
  SetVenuePricingRulesDto,
  UpdateCourtDto,
} from './dto/venue.dto';
import { VenuesService } from './venues.service';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  list(@Query() query: ListVenueDto) {
    return this.venues.listPublic(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.venues.getPublic(id);
  }

  @Get(':id/schedule')
  @UseGuards(OptionalJwtAuthGuard)
  schedule(
    @Param('id') id: string,
    @Query('date') date: string,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.venues.getSchedule(id, date, user?.userId);
  }
}

@Controller('partner/venues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PARTNER')
export class PartnerVenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.venues.listOwned(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVenueDto) {
    return this.venues.createVenue(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateVenueDto>,
  ) {
    return this.venues.updateVenue(user.userId, id, dto);
  }

  @Post(':venueId/courts')
  createCourt(
    @CurrentUser() user: AuthUser,
    @Param('venueId') venueId: string,
    @Body() dto: CreateCourtDto,
  ) {
    return this.venues.createCourt(user.userId, venueId, dto);
  }

  @Patch('courts/:courtId')
  updateCourt(
    @CurrentUser() user: AuthUser,
    @Param('courtId') courtId: string,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.venues.updateCourt(user.userId, courtId, dto);
  }

  @Delete('courts/:courtId')
  deleteCourt(@CurrentUser() user: AuthUser, @Param('courtId') courtId: string) {
    return this.venues.deleteCourt(user.userId, courtId);
  }

  @Get(':venueId/pricing-rules')
  listPricingRules(@Param('venueId') venueId: string) {
    return this.venues.listPricingRules(venueId);
  }

  @Post(':venueId/pricing-rules')
  createPricingRule(
    @CurrentUser() user: AuthUser,
    @Param('venueId') venueId: string,
    @Body() dto: CreateVenuePricingRuleDto,
  ) {
    return this.venues.createPricingRule(user.userId, venueId, dto);
  }

  @Delete(':venueId/pricing-rules/:ruleId')
  deletePricingRule(
    @CurrentUser() user: AuthUser,
    @Param('venueId') venueId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.venues.deletePricingRule(user.userId, venueId, ruleId);
  }

  @Put(':venueId/pricing-rules')
  setPricingRules(
    @CurrentUser() user: AuthUser,
    @Param('venueId') venueId: string,
    @Body() dto: SetVenuePricingRulesDto,
  ) {
    return this.venues.setPricingRules(user.userId, venueId, dto.rules);
  }
}
