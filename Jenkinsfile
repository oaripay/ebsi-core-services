pipeline {
  agent any

  stages {
    stage('Setup') {
      steps {
        nodejs(nodeJSInstallationName: '16.17.1') {
          sh 'yarn install --frozen-lockfile'
        }
      }
    }
    stage("Build and test the feature branch") {
      when {
        not {
          branch 'main'
        }
      }
      stages {
        stage('Fetch main branch') {
          steps {
            sh 'git fetch origin main:main'
          }
        }
        stage('Static analysis') {
          failFast true
          parallel {
            stage('Check changesets status') {
              steps {
                nodejs(nodeJSInstallationName: '16.17.1') {
                  sh 'yarn changeset status --since=main'
                }
              }
            }

            stage ('Lint Dockerfile-s') {
              agent {
                docker {
                    image 'hadolint/hadolint:latest-debian'
                    reuseNode true
                }
              }
              steps {
                sh 'hadolint Dockerfile apis/**/Dockerfile'
              }
            }

            stage('Lint affected packages') {
              steps {
                nodejs(nodeJSInstallationName: '16.17.1') {
                  sh "yarn lint"
                }
              }
            }

            stage('Audit dependencies') {
              steps {
                nodejs(nodeJSInstallationName: '16.17.1') {
                  sh 'yarn run audit'
                }
              }
            }
          }
        }
        stage('Unit test affected packages') {
          environment {
            API_PRIVATE_KEY=credentials('API_PRIVATE_KEY')
          }
          steps {
            nodejs(nodeJSInstallationName: '16.17.1') {
              sh 'yarn test'
            }
          }
        }
      }
    }
    stage("Build and deploy docker images from the main branch") {
      when {
        branch 'main'
      }
      stages {
        stage('Build docker images') {
          environment {
            DOCKER_BUILDKIT=1
          }
          steps {
            nodejs(nodeJSInstallationName: '16.17.1') {
              sh "yarn docker-build:all"
            }
          }
        }
        stage('Push to ECR') {
          steps {
            sh '/usr/local/bin/update_ecr.bash ${GIT_COMMIT}'
          }
        }
        stage('Modify YAML & Commit') {
          steps {
            sh '/usr/local/bin/update_yaml.bash ${GIT_COMMIT}'
          }
        }
        stage('Deploy on network') {
          steps {
            withCredentials([sshUserPrivateKey(credentialsId: 'ebsi1-robot', keyFileVariable: 'PK')]) {
              sh 'ssh mco /usr/local/bin/puppet_run_containers_only.sh test aio'
            }
          }
        }
      }
    }
  }

  post {
    always {
      cleanWs()
      dir("${env.WORKSPACE}@script") {
        deleteDir()
      }
    }
  }

}
