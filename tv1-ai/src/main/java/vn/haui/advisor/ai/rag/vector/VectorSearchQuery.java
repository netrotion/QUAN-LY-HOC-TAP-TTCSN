package vn.haui.advisor.ai.rag.vector;

import java.util.Arrays;
import java.util.Objects;

/**
 * Tham số truy vấn tìm kiếm Vector similarity kết hợp bộ lọc siêu dữ liệu (metadata filtering).
 */
public class VectorSearchQuery {

    private final float[] queryVector;
    private final int topK;
    private final double minScore;
    private final String sourceIdFilter;
    private final String versionFilter;

    public VectorSearchQuery(float[] queryVector, int topK, double minScore, String sourceIdFilter, String versionFilter) {
        if (queryVector == null || queryVector.length == 0) {
            throw new IllegalArgumentException("queryVector must not be null or empty");
        }
        if (topK <= 0) {
            throw new IllegalArgumentException("topK must be greater than 0: " + topK);
        }
        this.queryVector = queryVector.clone();
        this.topK = topK;
        this.minScore = minScore;
        this.sourceIdFilter = (sourceIdFilter != null && !sourceIdFilter.isBlank()) ? sourceIdFilter.trim() : null;
        this.versionFilter = (versionFilter != null && !versionFilter.isBlank()) ? versionFilter.trim() : null;
    }

    public static Builder builder() {
        return new Builder();
    }

    public float[] getQueryVector() {
        return queryVector.clone();
    }

    public float[] queryVector() {
        return queryVector.clone();
    }

    public int getTopK() {
        return topK;
    }

    public int topK() {
        return topK;
    }

    public double getMinScore() {
        return minScore;
    }

    public double minScore() {
        return minScore;
    }

    public String getSourceIdFilter() {
        return sourceIdFilter;
    }

    public String sourceIdFilter() {
        return sourceIdFilter;
    }

    public String getVersionFilter() {
        return versionFilter;
    }

    public String versionFilter() {
        return versionFilter;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        VectorSearchQuery that = (VectorSearchQuery) o;
        return topK == that.topK
                && Double.compare(that.minScore, minScore) == 0
                && Arrays.equals(queryVector, that.queryVector)
                && Objects.equals(sourceIdFilter, that.sourceIdFilter)
                && Objects.equals(versionFilter, that.versionFilter);
    }

    @Override
    public int hashCode() {
        int result = Objects.hash(topK, minScore, sourceIdFilter, versionFilter);
        result = 31 * result + Arrays.hashCode(queryVector);
        return result;
    }

    @Override
    public String toString() {
        return "VectorSearchQuery{" +
                "vectorDim=" + (queryVector != null ? queryVector.length : 0) +
                ", topK=" + topK +
                ", minScore=" + minScore +
                ", sourceIdFilter='" + sourceIdFilter + '\'' +
                ", versionFilter='" + versionFilter + '\'' +
                '}';
    }

    public static class Builder {
        private float[] queryVector;
        private int topK = 5;
        private double minScore = 0.0;
        private String sourceIdFilter;
        private String versionFilter;

        public Builder queryVector(float[] queryVector) {
            this.queryVector = queryVector;
            return this;
        }

        public Builder topK(int topK) {
            this.topK = topK;
            return this;
        }

        public Builder minScore(double minScore) {
            this.minScore = minScore;
            return this;
        }

        public Builder sourceIdFilter(String sourceIdFilter) {
            this.sourceIdFilter = sourceIdFilter;
            return this;
        }

        public Builder versionFilter(String versionFilter) {
            this.versionFilter = versionFilter;
            return this;
        }

        public VectorSearchQuery build() {
            return new VectorSearchQuery(queryVector, topK, minScore, sourceIdFilter, versionFilter);
        }
    }
}
