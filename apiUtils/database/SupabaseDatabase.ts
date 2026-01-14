import { createClient } from '@supabase/supabase-js';

import { DatabaseInterface, Release, Tracking, TrackingMetrics } from './DatabaseInterface';
import { Tables } from './DatabaseFactory';

export class SupabaseDatabase implements DatabaseInterface {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getLatestReleaseRecordForRuntimeVersion(runtimeVersion: string, platform?: string): Promise<Release | null> {
    let query = this.supabase
      .from(Tables.RELEASES)
      .select(
        'id, runtime_version, path, timestamp, commit_hash, commit_message, release_notes, update_id, platforms'
      )
      .eq('runtime_version', runtimeVersion);

    if (platform) {
      query = query.or(`platforms.is.null,platforms.ilike.%${platform}%`);
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      const release = data[0];
      return {
        id: release.id,
        runtimeVersion: release.runtime_version,
        path: release.path,
        timestamp: release.timestamp,
        commitHash: release.commit_hash,
        commitMessage: release.commit_message,
        releaseNotes: release.release_notes,
        updateId: release.update_id,
        platforms: release.platforms,
      };
    }

    return null;
  }

  async getReleaseByPath(path: string): Promise<Release | null> {
    const { data, error } = await this.supabase
      .from(Tables.RELEASES)
      .select()
      .eq('path', path)
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  }

  async getReleaseTrackingMetricsForAllReleases(): Promise<TrackingMetrics[]> {
    const { count: iosCount, error: iosError } = await this.supabase
      .from(Tables.RELEASES_TRACKING)
      .select('platform', { count: 'estimated', head: true })
      .eq('platform', 'ios');

    const { count: androidCount, error: androidError } = await this.supabase
      .from(Tables.RELEASES_TRACKING)
      .select('platform', { count: 'estimated', head: true })
      .eq('platform', 'android');

    if (iosError || androidError) throw new Error(iosError?.message || androidError?.message);
    return [
      {
        platform: 'ios',
        count: Number(iosCount),
      },
      {
        platform: 'android',
        count: Number(androidCount),
      },
    ];
  }
  async createTracking(tracking: Omit<Tracking, 'id'>): Promise<Tracking> {
    const { data, error } = await this.supabase
      .from(Tables.RELEASES_TRACKING)
      .insert({
        release_id: tracking.releaseId,
        platform: tracking.platform,
        download_timestamp: tracking.downloadTimestamp,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
  async getReleaseTrackingMetrics(releaseId: string): Promise<TrackingMetrics[]> {
    const { count: iosCount, error: iosError } = await this.supabase
      .from(Tables.RELEASES_TRACKING)
      .select('platform', { count: 'estimated', head: true })
      .eq('release_id', releaseId)
      .eq('platform', 'ios');

    const { count: androidCount, error: androidError } = await this.supabase
      .from(Tables.RELEASES_TRACKING)
      .select('platform', { count: 'estimated', head: true })
      .eq('release_id', releaseId)
      .eq('platform', 'android');

    if (iosError || androidError) throw new Error(iosError?.message || androidError?.message);

    return [
      {
        platform: 'ios',
        count: Number(iosCount),
      },
      {
        platform: 'android',
        count: Number(androidCount),
      },
    ];
  }

  async createRelease(release: Omit<Release, 'id'>): Promise<Release> {
    const { data, error } = await this.supabase
      .from(Tables.RELEASES)
      .insert({
        path: release.path,
        runtime_version: release.runtimeVersion,
        timestamp: release.timestamp,
        commit_hash: release.commitHash,
        commit_message: release.commitMessage,
        release_notes: release.releaseNotes || null,
        update_id: release.updateId,
        platforms: release.platforms || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRelease(id: string): Promise<Release | null> {
    const { data, error } = await this.supabase
      .from(Tables.RELEASES)
      .select()
      .eq('id', id)
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    if (data && data.length > 0) {
      const release = data[0];
      return {
        id: release.id,
        path: release.path,
        runtimeVersion: release.runtime_version,
        timestamp: release.timestamp,
        commitHash: release.commit_hash,
        commitMessage: release.commit_message,
      };
    }

    return null;
  }

  async listReleases(): Promise<Release[]> {
    const { data, error } = await this.supabase
      .from(Tables.RELEASES)
      .select()
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data.map((release) => ({
      id: release.id,
      path: release.path,
      runtimeVersion: release.runtime_version,
      timestamp: release.timestamp,
      size: release.size,
      commitHash: release.commit_hash,
      commitMessage: release.commit_message,
    }));
  }
}
